from datetime import date
from pathlib import Path

import pytest

from dfx.smbs import ParseError, parse

FIXTURES = Path(__file__).parent / "fixtures"


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


def test_no_rows_raises():
    with pytest.raises(ParseError, match="no rate rows"):
        parse(b"<chart></chart>")
