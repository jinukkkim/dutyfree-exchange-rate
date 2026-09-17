"""신세계면세점이 게시한 당일 적용환율 — 교차검증용 2차 소스.

보세판매장 운영에 관한 고시 제3조제4항제3호가 모든 면세점에 당일 적용환율의
홈페이지 게시를 의무화하므로, 이 소스의 존재 자체는 법으로 보장된다.
다만 마크업은 보장되지 않는다.

이것은 **검증 소스**이지 1차 소스가 아니다. 여기가 실패해도 수집은 진행한다 —
검증 수단을 잃었다고 기록을 멈추면 검증이 수집을 인질로 잡는다.
"""

import re

URL = "https://www.ssgdfs.com/kr/main/initMain"

# <span class="todayRate">오늘의 환율<em>$1 = 1,353.30원</em></span>
_RATE = re.compile(
    r'class="todayRate"[^>]*>.*?\$\s*1\s*=\s*([\d,]+(?:\.\d+)?)\s*원',
    re.DOTALL,
)


class CrossCheckError(Exception):
    """검증 소스에서 환율을 읽을 수 없음."""


def parse_today_rate(html: str) -> float:
    match = _RATE.search(html)
    if not match:
        raise CrossCheckError("todayRate markup not found — layout may have changed")
    return float(match.group(1).replace(",", ""))
