"""고시일과 적용일 사이의 변환.

보세판매장 운영에 관한 고시 제3조제4항제1호:

    해당 물품을 판매하는 날의 전일(최종 고시한 날을 말한다)의
    「외국환거래법」에 의한 기준환율 또는 재정환율을 적용

"전일(최종 고시한 날)"이 핵심이다. 문자 그대로의 어제가 아니라 직전 고시일이며,
주말·공휴일 이월이 법조문 안에 들어 있다. 그래서 공휴일 달력을 관리할 필요가
없다 — 고시된 날만 저장하고 나머지는 이 함수가 채운다.
"""

from collections.abc import Sequence
from datetime import date, datetime
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


def today_kst() -> date:
    return datetime.now(KST).date()


def fixing_for(fixing_dates: Sequence[date], target: date) -> date | None:
    """target 일에 적용되는 환율의 고시일. 해당하는 고시가 없으면 None.

    고시일 D 의 값은 D+1 부터 다음 고시일까지 적용되므로, target 보다 **앞선**
    고시일 중 가장 늦은 것이 답이다. target 당일의 고시는 아직 적용되지 않는다.
    """
    earlier = [d for d in fixing_dates if d < target]
    return max(earlier) if earlier else None
