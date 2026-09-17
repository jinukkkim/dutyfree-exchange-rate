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
        if merged.get(row.fixing_date) != row:
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
