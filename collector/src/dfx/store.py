"""data/*.csv 읽기·병합·쓰기.

저장 단위는 **고시일**이다. 적용일은 저장하지 않고 fixing.fixing_for() 로
파생한다 — 그래야 주말·공휴일 이월이 데이터가 아니라 규칙이 되고, 공휴일
달력을 관리하지 않아도 된다.

git 에 커밋되는 파일이므로 사람이 diff 로 읽을 수 있어야 한다. 그래서 CSV 이고,
정렬이 안정적이어야 한다 — 순서가 흔들리면 매일 전체 파일이 변경으로 잡힌다.
"""

import csv
from datetime import date
from pathlib import Path
from typing import NamedTuple

RATES_HEADER = ["fix_date", "rate", "method", "source", "collected_at"]

# 외국환거래규정 개정(2027.1.1. 시행)으로 달러-원 매매기준율 산출이
# 시장평균환율(MAR)에서 시간가중평균환율(TWAP)로 바뀐다. 시계열에 방법론 단절이
# 생기므로 데이터가 스스로 그것을 들고 있어야 한다.
TWAP_FROM = date(2027, 1, 1)


class Row(NamedTuple):
    fixing_date: date
    rate: float
    method: str
    source: str
    collected_at: str


def method_for(fixing_date: date) -> str:
    return "TWAP" if fixing_date >= TWAP_FROM else "MAR"


def read_rates(path: Path) -> list[Row]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        rows = [
            Row(
                date.fromisoformat(record["fix_date"]),
                float(record["rate"]),
                record["method"],
                record["source"],
                record["collected_at"],
            )
            for record in csv.DictReader(handle)
        ]
    rows.sort(key=lambda r: r.fixing_date)
    return rows


def upsert(existing: list[Row], incoming: list[Row]) -> tuple[list[Row], int]:
    """incoming 으로 existing 을 갱신하고 (병합 결과, 변경 건수)를 돌려준다.

    수집기는 매일 최근 10일을 겹쳐 받으므로 대부분의 호출은 변경 0 이다.
    변경이 0 이면 호출자가 커밋을 건너뛴다.
    """
    merged = {row.fixing_date: row for row in existing}
    changed = 0
    for row in incoming:
        old = merged.get(row.fixing_date)
        # 행 전체를 비교하면 안 된다. collected_at 은 매 실행마다 반드시 달라지므로
        # 값이 하나도 안 바뀐 날에도 10 행 전부가 "변경"으로 잡히고, 위의 changed == 0
        # 분기가 영영 죽는다. 그러면 매일 같은 10 행이 diff 에 떠서 진짜 값 변동이
        # 잡음에 묻힌다 — 데이터를 git 에 두는 이유가 diff 인데 그 diff 를 망친다.
        #
        # source 를 비교에서 빼는 것도 같은 이유다. 신세계가 하루 다운되면
        # smbs+ssgdfs -> smbs 로 되돌아가며 또 churn 이 생긴다. 한번 두 소스로
        # 확인된 값은 오늘 확인을 못 했다고 해서 덜 확인된 것이 되지 않는다.
        if old is not None and (old.rate, old.method) == (row.rate, row.method):
            continue
        merged[row.fixing_date] = row
        changed += 1
    return [merged[key] for key in sorted(merged)], changed


def write_rates(path: Path, rows: list[Row]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(RATES_HEADER)
        for row in rows:
            writer.writerow(
                [
                    row.fixing_date.isoformat(),
                    f"{row.rate:g}",
                    row.method,
                    row.source,
                    row.collected_at,
                ]
            )


# ECOS 에서 각 고시치를 **처음 본** 시각. smbs 의 collected_at 과 나란히 놓고
# ECOS 가 얼마나 늦게 올라오는지 재는 용도다. 같은 회차에 들어오면 두 값이
# 같고, 그게 며칠 이어지면 ECOS 를 1차 소스로 올릴 근거가 된다.
#
# 한번 적은 행은 다시 쓰지 않는다. 다시 쓰면 "처음 본" 이 "마지막으로 본" 이
# 된다. seen_at 이 빈 행은 측정을 시작하기 전부터 ECOS 에 있던 값이다.
ECOS_SEEN_HEADER = ["fix_date", "rate", "seen_at"]


def read_seen(path: Path) -> dict[date, tuple[float, str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {
            date.fromisoformat(r["fix_date"]): (float(r["rate"]), r["seen_at"])
            for r in csv.DictReader(handle)
        }


def write_seen(path: Path, seen: dict[date, tuple[float, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(ECOS_SEEN_HEADER)
        for fixing_date in sorted(seen):
            rate, seen_at = seen[fixing_date]
            writer.writerow([fixing_date.isoformat(), f"{rate:g}", seen_at])
