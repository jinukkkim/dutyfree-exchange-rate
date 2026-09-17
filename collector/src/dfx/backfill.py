"""2016년 이후 전체 이력을 한 번에 받아 채운다. 1회성 스크립트다.

같은 엔드포인트가 2,637 영업일(약 160KB)을 단일 요청으로 돌려준다.
이후로는 collect.py 의 일별 수집에 맡긴다.
"""

import sys
from datetime import date, datetime

import httpx

from dfx.collect import RATES_PATH, TIMEOUT, fetch_window
from dfx.fixing import KST, today_kst
from dfx.store import Row, method_for, read_rates, upsert, write_rates
from dfx.validate import check_range

START = date(2016, 1, 1)


def main() -> int:
    collected_at = datetime.now(KST).isoformat(timespec="seconds")
    with httpx.Client(timeout=TIMEOUT) as client:
        fetched = fetch_window(client, START, today_kst())

    for fixing_date, rate in fetched:
        check_range(rate, fixing_date)

    incoming = [
        Row(d, rate, method_for(d), "smbs", collected_at) for d, rate in fetched
    ]
    merged, changed = upsert(read_rates(RATES_PATH), incoming)
    write_rates(RATES_PATH, merged)
    print(f"backfilled {changed} row(s), {len(merged)} total", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
