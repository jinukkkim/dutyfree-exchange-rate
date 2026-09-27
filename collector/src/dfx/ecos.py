"""한국은행 ECOS 매매기준율 — 교차검증용 공식 API.

통계표 731Y001(주요국 통화의 대원화환율) 항목 0000001(원/미국달러 매매기준율).
ECOS 가 계산한 값이 아니라 서울외국환중개 공표치를 옮겨 실은 것이며, 메타데이터의
출처 기관(ORG_NAME)도 서울외국환중개다. 2016-01-04 ~ 2026-09-23 의 2,641 영업일
전부가 smbs 와 날짜·값 모두 일치했다.

smbs 와 값은 같고 경로만 다르다. 이쪽은 문서화된 공식 API 라 예고 없이 바뀔
위험이 낮은 대신, 원본에서 한 단계 떨어져 있어 smbs 보다 먼저 올라올 수는 없다.
얼마나 늦는지는 아직 모른다 — 그래서 collect.py 가 처음 본 시각을 기록한다.

오류도 HTTP 200 으로 온다. 본문의 RESULT.CODE 로 구분한다.
"""

from datetime import date, datetime

URL_TEMPLATE = (
    "https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/100/"
    "731Y001/D/{start:%Y%m%d}/{end:%Y%m%d}/0000001"
)

# 구간 안에 고시가 하나도 없을 때(주말만 조회 등) 오는 코드. 오류가 아니다.
_NO_DATA = "INFO-200"


class EcosError(Exception):
    """응답이 왔지만 환율을 뽑을 수 없음."""


def parse(body: object) -> list[tuple[date, float]]:
    if not isinstance(body, dict):
        raise EcosError(f"unexpected body: {type(body).__name__}")
    if "StatisticSearch" not in body:
        result = body.get("RESULT", {})
        if result.get("CODE") == _NO_DATA:
            return []
        raise EcosError(f"{result.get('CODE')}: {result.get('MESSAGE')}")

    try:
        rows = [
            (datetime.strptime(r["TIME"], "%Y%m%d").date(), float(r["DATA_VALUE"]))
            for r in body["StatisticSearch"]["row"]
        ]
    except (KeyError, TypeError, ValueError) as exc:
        raise EcosError(f"unexpected row shape: {exc!r}") from exc
    rows.sort()
    return rows
