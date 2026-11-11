from datetime import date

import httpx
import pytest

from dfx import reference
from dfx.store import ReferenceRate, read_reference_rates, write_reference_rates

ECB = b'''<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
 xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
 <Cube><Cube time="2026-11-10"><Cube currency="KRW" rate="1500"/>
 <Cube currency="CNY" rate="7.5"/><Cube currency="HKD" rate="8"/></Cube></Cube>
 </gesmes:Envelope>'''
TWD = b"<chart><set label='26.11.10' value='41.33' /></chart>"
DAY = date(2026, 11, 10)


def test_ecb_euro_quotes_become_krw_per_one_currency():
    assert reference.parse_ecb(ECB, DAY) == [
        ReferenceRate(DAY, "CNY", 200, "ecb"),
        ReferenceRate(DAY, "HKD", 187.5, "ecb"),
    ]


@pytest.mark.parametrize("bad", [b"0", b"NaN", b"0.075", b"inf"])
def test_bad_cny_does_not_hide_good_hkd(bad):
    assert reference.parse_ecb(ECB.replace(b'"7.5"', b'"' + bad + b'"'), DAY) == [
        ReferenceRate(DAY, "HKD", 187.5, "ecb"),
    ]


def test_future_ecb_data_is_rejected():
    with pytest.raises(ValueError):
        reference.parse_ecb(ECB, date(2026, 11, 9))


@pytest.mark.parametrize("body", [b"broken xml", ECB.replace(b'"KRW"', b'"USD"')])
def test_bad_ecb_document_is_rejected(body):
    with pytest.raises(ValueError):
        reference.parse_ecb(body, DAY)


@pytest.mark.parametrize("failed", ["ecb", "smbs", None])
def test_sources_can_fail_independently(failed):
    def handle(request):
        source = "ecb" if request.url.host == "www.ecb.europa.eu" else "smbs"
        if source == failed:
            return httpx.Response(503)
        if source == "smbs":
            assert "TWD_2026-11-01_2026-11-10" in str(request.url)
        return httpx.Response(200, content=ECB if source == "ecb" else TWD)

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        rows = reference.fetch(client, date(2026, 11, 1), DAY)
    currencies = {row.currency for row in rows}
    assert currencies == {"ecb": {"TWD"}, "smbs": {"CNY", "HKD"}, None: {"CNY", "TWD", "HKD"}}[failed]


def test_twd_unit_changes_are_filtered_without_blocking_ecb():
    with httpx.Client(transport=httpx.MockTransport(lambda req: httpx.Response(
        200, content=ECB if req.url.host == "www.ecb.europa.eu" else TWD.replace(b"41.33", b"4133")
    ))) as client:
        assert {row.currency for row in reference.fetch(client, DAY, DAY)} == {"CNY", "HKD"}


def test_reference_csv_round_trip_preserves_currency_source_and_precision(tmp_path):
    path = tmp_path / "reference.csv"
    assert read_reference_rates(path) == {}
    rows = {
        (DAY, "CNY"): ReferenceRate(DAY, "CNY", 200.73956230531677, "ecb"),
        (DAY, "TWD"): ReferenceRate(DAY, "TWD", 41.33, "smbs"),
    }
    write_reference_rates(path, rows)
    assert read_reference_rates(path) == rows
