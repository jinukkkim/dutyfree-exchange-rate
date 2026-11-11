from datetime import date
from pathlib import Path

import httpx
import pytest

from dfx import smbs
from dfx.smbs import ParseError, parse

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize("currency", ["USD", "JPY", "TWD"])
def test_shared_fetch_sends_currency_dates_and_xml_headers(currency):
    def handle(request):
        assert request.url.params["arr_value"] == f"{currency}_2026-11-01_2026-11-10"
        assert request.headers["X-Requested-With"] == "XMLHttpRequest"
        assert request.headers["User-Agent"].startswith("duty-free-exchange-rate/")
        return httpx.Response(200, content=b"<chart><set label='26.11.10' value='100.5'/></chart>")

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        assert smbs.fetch_window(client, date(2026, 11, 1), date(2026, 11, 10), currency) == [
            (date(2026, 11, 10), 100.5),
        ]


def test_shared_fetch_preserves_http_and_parse_errors():
    with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(503))) as client:
        with pytest.raises(httpx.HTTPStatusError):
            smbs.fetch_window(client, date(2026, 11, 1), date(2026, 11, 10))
    with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, content=b"<chart/>"))) as client:
        with pytest.raises(ParseError):
            smbs.fetch_window(client, date(2026, 11, 1), date(2026, 11, 10))


def test_parses_euc_kr_and_sorts_by_fixing_date():
    rows = parse((FIXTURES / "smbs_sample.xml").read_bytes())

    assert rows[0] == (date(2026, 9, 11), 1338.2)
    assert rows[-1] == (date(2026, 9, 17), 1368.3)
    assert [d for d, _ in rows] == sorted(d for d, _ in rows)
    assert len(rows) == 5


def test_empty_value_raises_instead_of_being_skipped():
    """devremon 은 value='' 를 몇 달간 조용히 흘렸다. 건너뛰면 같은 실패가 된다."""
    with pytest.raises(ParseError, match="2026-09-17"):
        parse((FIXTURES / "smbs_empty_value.xml").read_bytes())


def test_malformed_date_or_rate_is_a_parse_error():
    """ValueError 로 새면 호출부의 except 를 지나쳐 수집 전체가 죽는다."""
    with pytest.raises(ParseError, match="bad rate"):
        parse(b"<set label='26.09.17' value='1,368.3'/>")
    with pytest.raises(ParseError, match="bad date"):
        parse(b"<set label='26.13.40' value='1368.3'/>")


def test_no_rows_raises():
    with pytest.raises(ParseError, match="no rate rows"):
        parse(b"<chart></chart>")
