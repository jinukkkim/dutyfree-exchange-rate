from datetime import date

import pytest

from dfx.validate import ValidationError, check_range, is_abnormal_move

D = date(2026, 9, 17)


def test_plausible_rate_passes():
    check_range(1368.3, D)


def test_rate_outside_range_raises():
    with pytest.raises(ValidationError):
        check_range(13.683, D)
    with pytest.raises(ValidationError):
        check_range(136830.0, D)


def test_normal_move_is_not_abnormal():
    """10년간 관측된 일간 최대 변동은 42.3원이었다."""
    assert is_abnormal_move(1353.3, 1368.3) is False
    assert is_abnormal_move(1400.0, 1357.7) is False


def test_large_move_is_flagged():
    assert is_abnormal_move(1353.3, 1500.0) is True


def test_abnormal_move_does_not_raise():
    """급변은 거부 사유가 아니다. 실제로 일어날 수 있으므로 기록하고 표시만 한다."""
    assert is_abnormal_move(1000.0, 2000.0) is True
