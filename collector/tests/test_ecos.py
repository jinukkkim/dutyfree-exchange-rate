import json
from datetime import date
from pathlib import Path

import pytest

from dfx.ecos import EcosError, parse

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_rows_sorted():
    body = json.loads((FIXTURES / "ecos_sample.json").read_text(encoding="utf-8"))
    rows = parse(body)
    assert rows[0] == (date(2026, 9, 14), 1346.4)
    assert rows[-1] == (date(2026, 9, 23), 1360.0)
    assert len(rows) == 8


def test_no_data_is_empty_not_error():
    """주말만 걸친 구간은 INFO-200 으로 온다. 장애로 취급하면 안 된다."""
    assert parse({"RESULT": {"CODE": "INFO-200", "MESSAGE": "해당하는 데이터가 없습니다."}}) == []


def test_error_code_raises():
    """잘못된 키도 HTTP 200 으로 온다. 본문을 안 보면 빈 결과로 삼켜진다."""
    with pytest.raises(EcosError, match="INFO-100"):
        parse({"RESULT": {"CODE": "INFO-100", "MESSAGE": "인증키가 유효하지 않습니다."}})


def test_empty_value_raises():
    body = {"StatisticSearch": {"row": [{"TIME": "20260923", "DATA_VALUE": ""}]}}
    with pytest.raises(EcosError):
        parse(body)
