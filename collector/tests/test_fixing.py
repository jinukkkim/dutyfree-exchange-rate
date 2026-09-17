from datetime import date

from dfx.fixing import fixing_for

# 2026-09-11 은 금요일. 09-12 토, 09-13 일, 09-14 월.
# 실측: 면세점 적용환율이 09-12·13·14 사흘 모두 1,338.2 (= 09-11 고시)였다.
FIXINGS = [
    date(2026, 9, 11),
    date(2026, 9, 14),
    date(2026, 9, 15),
    date(2026, 9, 16),
    date(2026, 9, 17),
]


def test_weekend_carries_friday_fixing():
    for target in (date(2026, 9, 12), date(2026, 9, 13), date(2026, 9, 14)):
        assert fixing_for(FIXINGS, target) == date(2026, 9, 11)


def test_applies_previous_fixing_not_same_day():
    """고시 09-17 은 09-18 에 적용된다. 09-17 당일에 적용되는 것은 09-16 고시다."""
    assert fixing_for(FIXINGS, date(2026, 9, 17)) == date(2026, 9, 16)
    assert fixing_for(FIXINGS, date(2026, 9, 18)) == date(2026, 9, 17)


def test_target_before_any_fixing_returns_none():
    assert fixing_for(FIXINGS, date(2026, 9, 11)) is None


def test_long_holiday_carries_forward():
    """연휴로 고시가 없는 날이 이어져도 직전 고시일이 계속 적용된다."""
    fixings = [date(2026, 9, 25), date(2026, 10, 5)]
    assert fixing_for(fixings, date(2026, 10, 3)) == date(2026, 9, 25)
    assert fixing_for(fixings, date(2026, 10, 5)) == date(2026, 9, 25)
    assert fixing_for(fixings, date(2026, 10, 6)) == date(2026, 10, 5)
