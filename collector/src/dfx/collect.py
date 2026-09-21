"""수집 엔트리포인트. GitHub Actions 가 매시간 호출한다.

규정상 고시는 "영업일 1회 08:00" 이지만 그것은 제도상의 시각이고, 값은 훨씬 먼저
원본에 올라온다 — 직전 영업일 09:00~15:30 체결분의 가중평균이므로 15:30 이면 이미
계산이 끝난 값이다. 실제로 2026-09-21(월) 고시치는 그날 03:08 에 이미 조회됐다.

적용환율은 00시에 전환되므로, 하루 한 번 09:00 에만 받으면 이미 확정된 내일치를
최대 17시간 동안 "예상" 으로 표시하게 된다. 이 프로젝트의 주장이 "예측이 아니다"
인 이상 그 구간이 곧 틀린 표시다. 그래서 매시간 돌린다.

창을 좁히지 않고 24시간 균일하게 도는 이유: 공표 시각을 아무도 모른다. 원본은
날짜와 값만 주고 공표 시각을 주지 않으므로 과거 데이터로는 영영 알 수 없다.
대신 upsert 가 값이 안 바뀐 행을 건드리지 않으므로 `collected_at` 이 곧 "그 값을
처음 본 시각" 이 되고, 매시간 돌리면 그것이 ±1시간 정밀도의 공표 시각 관측치가
된다. 몇 주 쌓인 뒤에 창을 좁힐지 정하면 된다. 2027-01-01 에 산출식이 TWAP(16:00
기준)로 바뀌므로, 지금 창을 박아두면 어차피 그때 틀린 창이 된다.

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

    # 재시도가 없으면 원본의 순간 장애가 그대로 실패가 된다. 하루 1회일 때는
    # 넘어갈 만했지만 매시간이면 딸꾹질 한 번이 실패 메일 한 통이다.
    with httpx.Client(timeout=TIMEOUT, transport=httpx.HTTPTransport(retries=3)) as client:
        try:
            fetched = fetch_window(client, today - timedelta(days=OVERLAP_DAYS), today)
        except (httpx.HTTPError, smbs.ParseError) as exc:
            print(f"FATAL collection failed: {exc}", file=sys.stderr)
            return 1

        existing = read_rates(RATES_PATH)
        known = {row.fixing_date: row.rate for row in existing}
        known_dates = sorted(known)

        checked: list[tuple[date, float, str]] = []
        for fixing_date, rate in fetched:
            try:
                check_range(rate, fixing_date)
            except ValidationError as exc:
                print(f"FATAL {exc}", file=sys.stderr)
                return 1

            # 달력상 어제가 아니라 **직전 고시일**을 본다. 고시는 영업일에만 있으므로
            # 어제로 찾으면 월요일과 연휴 다음 첫 거래일에 previous 가 None 이 되어
            # 검사가 통째로 빠진다 — 며칠치가 몰려 변동이 가장 클 수 있는 바로 그 날이다.
            previous_date = fixing_for(known_dates, fixing_date)
            previous = known.get(previous_date) if previous_date is not None else None
            if previous is not None and is_abnormal_move(previous, rate):
                print(
                    f"WARN abnormal move on {fixing_date.isoformat()}: "
                    f"{previous} -> {rate}",
                    file=sys.stderr,
                )

            checked.append((fixing_date, rate, method_for(fixing_date)))

        # 교차검증은 쓸 값이 있을 때만 한다. 매시간 도는 24 회 중 새 고시가 들어오는
        # 회차는 하루 한 번뿐인데, 나머지 23 번까지 남의 상용 사이트를 칠 이유가 없다.
        #
        # 변경 여부를 여기서 다시 판정하지 않고 upsert 에 물어본다. 같은 규칙
        # (rate, method 만 비교) 이 두 군데로 갈라지면 언젠가 어긋나고, 어긋난 쪽이
        # 교차검증을 조용히 건너뛰어도 아무 증상이 없다.
        _, pending = upsert(
            existing, [Row(d, r, m, "smbs", collected_at) for d, r, m in checked]
        )
        verified = cross_check(client, fetched, today) if pending else False

    source = "smbs+ssgdfs" if verified else "smbs"
    merged, changed = upsert(
        existing, [Row(d, r, m, source, collected_at) for d, r, m in checked]
    )

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
    # 체크아웃은 잡 시작 시점의 스냅샷이다. 그 뒤 push 까지 사이에 main 이 움직이면
    # non-fast-forward 로 거부되고, 데이터와 무관한 남의 머지 때문에 실패 메일이
    # 날아간다. 지운 collect.sh 도 같은 이유로 push 전에 pull 을 먼저 했다.
    subprocess.run(["git", "pull", "--rebase"], cwd=REPO_ROOT, check=True)
    subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True)
    print(f"committed {changed} row(s), latest fixing {latest.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
