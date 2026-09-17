from pathlib import Path

import pytest

from dfx.ssgdfs import CrossCheckError, parse_today_rate

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_posted_rate():
    html = (FIXTURES / "ssgdfs_main.html").read_text(encoding="utf-8")
    assert parse_today_rate(html) == 1353.30


def test_missing_markup_raises():
    """마크업이 바뀌면 조용히 0을 반환하지 말고 알려야 한다."""
    with pytest.raises(CrossCheckError):
        parse_today_rate("<html><body>no rate here</body></html>")
