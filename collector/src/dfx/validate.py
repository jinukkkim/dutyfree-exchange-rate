"""수집한 값이 기록할 만한지 판정한다.

거부와 플래그를 구분한다. 범위를 벗어난 값은 파싱이 어긋났다는 뜻이므로 거부하고,
급변은 실제로 일어날 수 있으므로 기록하되 표시만 한다. 있을 수 있는 일을 거부하면
진짜 사건을 놓친다.
"""

from datetime import date

MIN_RATE = 500.0
MAX_RATE = 5000.0

# 2016-01-04 ~ 2026-09-17 의 2,637 영업일에서 관측된 일간 최대 변동은 42.3원이었다.
# 100원은 그 두 배를 넘으므로, 넘었다면 값보다 파싱을 먼저 의심할 구간이다.
MAX_DAILY_MOVE = 100.0


class ValidationError(Exception):
    """값이 기록 불가능한 상태."""


def check_range(rate: float, fixing_date: date) -> None:
    if not MIN_RATE <= rate <= MAX_RATE:
        raise ValidationError(
            f"{fixing_date.isoformat()}: rate {rate} outside "
            f"[{MIN_RATE}, {MAX_RATE}]"
        )


def is_abnormal_move(previous: float, current: float) -> bool:
    return abs(current - previous) > MAX_DAILY_MOVE
