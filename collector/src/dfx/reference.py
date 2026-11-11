"""중국어판 환산 참고값. CNY·HKD는 ECB, TWD는 SMBS에서 받는다."""

import math
import sys
from datetime import date
from xml.etree import ElementTree as ET

import httpx

from dfx import HEADERS, smbs
from dfx.store import ReferenceRate

# 최신 하루만 받으면 장애 중에 놓친 날짜를 복구할 수 없다.
ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml"
# 1통화당 원화. 100통화 등 단위가 바뀐 응답이 그대로 표시되지 않도록 거른다.
BOUNDS = {"CNY": (100, 500), "HKD": (80, 400), "TWD": (10, 100)}


def in_range(currency: str, rate: float) -> bool:
    low, high = BOUNDS[currency]
    return math.isfinite(rate) and low < rate < high


def parse_ecb(xml: bytes, today: date) -> list[ReferenceRate]:
    try:
        root = ET.fromstring(xml)
        cubes = [node for node in root.iter() if "time" in node.attrib]
        if not cubes:
            raise ValueError("no dated ECB rates")
    except (ET.ParseError, ValueError) as exc:
        raise ValueError("invalid ECB reference rates") from exc

    rows = []
    for cube in cubes:
        try:
            fixing_date = date.fromisoformat(cube.attrib["time"])
            quotes = {node.attrib["currency"]: float(node.attrib["rate"]) for node in cube if "currency" in node.attrib}
            krw = quotes["KRW"]
        except (KeyError, ValueError) as exc:
            raise ValueError("invalid ECB reference rates") from exc
        if fixing_date > today or not math.isfinite(krw) or krw <= 0:
            raise ValueError("invalid ECB reference date or KRW quote")

        for currency in ("CNY", "HKD"):
            quote = quotes.get(currency, 0)
            rate = krw / quote if math.isfinite(quote) and quote > 0 else 0
            if in_range(currency, rate):
                rows.append(ReferenceRate(fixing_date, currency, rate, "ecb"))
            else:
                print(f"WARN {currency} ECB quote missing or out of range on {fixing_date}", file=sys.stderr)
    return sorted(rows)


def fetch(client: httpx.Client, start: date, today: date) -> list[ReferenceRate]:
    rows = []
    try:
        response = client.get(ECB_URL, headers=HEADERS)
        response.raise_for_status()
        rows.extend(parse_ecb(response.content, today))
    except (httpx.HTTPError, ValueError) as exc:
        print(f"WARN ECB reference unavailable: {exc}", file=sys.stderr)

    try:
        for fixing_date, rate in smbs.fetch_window(client, start, today, "TWD"):
            if start <= fixing_date <= today and in_range("TWD", rate):
                rows.append(ReferenceRate(fixing_date, "TWD", rate, "smbs"))
            else:
                print(f"WARN TWD invalid date or out of range: {fixing_date} {rate}", file=sys.stderr)
    except (httpx.HTTPError, smbs.ParseError) as exc:
        print(f"WARN TWD reference unavailable: {exc}", file=sys.stderr)
    return rows
