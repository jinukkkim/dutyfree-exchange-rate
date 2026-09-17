"""일일 수집 엔트리포인트. KST 09:00 크론이 호출한다.

매매기준율은 영업일 08:00 에 한 번 고시되고 그날 안에 바뀌지 않으므로 하루 한 번이면
충분하다. 09:00 은 고시 후 한 시간의 여유다.

하루치가 아니라 최근 10일을 겹쳐 받는다. 장애나 연휴로 빠진 날이 자동으로 메워지고,
과거 값이 정정되면 그때 드러난다.
"""

import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import httpx

from dfx import smbs, ssgdfs
from dfx.fixing import KST, fixing_for, today_kst
from dfx.store import Row, method_for, read_rates, upsert, write_rates
from dfx.validate import ValidationError, check_range, is_abnormal_move

REPO_ROOT = Path(__file__).resolve().parents[3]
RATES_PATH = REPO_ROOT / "data" / "rates.csv"

OVERLAP_DAYS = 10
STALE_AFTER_DAYS = 7  # 한국 최장 연휴가 설·추석 + 주말로 5일 안팎이다
TIMEOUT = httpx.Timeout(45.0)
HEADERS = {"User-Agent": "duty-free-exchange-rate/1.0 (+https://github.com)"}


def fetch_window(client: httpx.Client, start: date, end: date) -> list[tuple[date, float]]:
    url = smbs.URL_TEMPLATE.format(
        code="USD", start=start.isoformat(), end=end.isoformat()
    )
    response = client.get(url, headers={**HEADERS, "X-Requested-With": "XMLHttpRequest"})
    response.raise_for_status()
    return smbs.parse(response.content)


def cross_check(client: httpx.Client, rows: list[tuple[date, float]], today: date) -> bool:
    """신세계가 게시한 당일 적용환율이 우리 매핑과 일치하는지 본다.

    실패해도 예외를 올리지 않는다. 검증 소스이지 1차 소스가 아니다.
    """
    expected_fixing = fixing_for([d for d, _ in rows], today)
    if expected_fixing is None:
        return False
    expected = dict(rows)[expected_fixing]

    try:
        response = client.get(ssgdfs.URL, headers=HEADERS, follow_redirects=True)
        response.raise_for_status()
        posted = ssgdfs.parse_today_rate(response.text)
    except (httpx.HTTPError, ssgdfs.CrossCheckError) as exc:
        print(f"WARN cross-check unavailable: {exc}", file=sys.stderr)
        return False

    if abs(posted - expected) > 0.005:
        print(
            f"WARN cross-check mismatch: ssgdfs={posted} smbs={expected} "
            f"(fixing {expected_fixing.isoformat()})",
            file=sys.stderr,
        )
        return False
    return True


def main() -> int:
    today = today_kst()
    collected_at = datetime.now(KST).isoformat(timespec="seconds")

    with httpx.Client(timeout=TIMEOUT) as client:
        try:
            fetched = fetch_window(client, today - timedelta(days=OVERLAP_DAYS), today)
        except (httpx.HTTPError, smbs.ParseError) as exc:
            print(f"FATAL collection failed: {exc}", file=sys.stderr)
            return 1

        verified = cross_check(client, fetched, today)

    source = "smbs+ssgdfs" if verified else "smbs"
    existing = read_rates(RATES_PATH)
    known = {row.fixing_date: row.rate for row in existing}

    incoming: list[Row] = []
    for fixing_date, rate in fetched:
        try:
            check_range(rate, fixing_date)
        except ValidationError as exc:
            print(f"FATAL {exc}", file=sys.stderr)
            return 1

        previous = known.get(fixing_date - timedelta(days=1))
        if previous is not None and is_abnormal_move(previous, rate):
            print(
                f"WARN abnormal move on {fixing_date.isoformat()}: "
                f"{previous} -> {rate}",
                file=sys.stderr,
            )

        incoming.append(
            Row(fixing_date, rate, method_for(fixing_date), source, collected_at)
        )

    merged, changed = upsert(existing, incoming)

    latest = merged[-1].fixing_date
    if (today - latest).days > STALE_AFTER_DAYS:
        print(
            f"WARN data stale: latest fixing {latest.isoformat()} is "
            f"{(today - latest).days} days old",
            file=sys.stderr,
        )

    if changed == 0:
        print(f"no change (latest fixing {latest.isoformat()})")
        return 0

    write_rates(RATES_PATH, merged)
    subprocess.run(["git", "add", str(RATES_PATH)], cwd=REPO_ROOT, check=True)
    subprocess.run(
        ["git", "commit", "-m", f"data(collect): rates through {latest.isoformat()}"],
        cwd=REPO_ROOT,
        check=True,
    )
    subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True)
    print(f"committed {changed} row(s), latest fixing {latest.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
