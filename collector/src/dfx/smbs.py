"""서울외국환중개 매매기준율 XML 파싱.

차트 iframe(`/tvchart.html`)이 쓰는 비공개 엔드포인트다. 화면용 StdExRate.jsp 는
EUC-KR JSP 폼 POST 라 파싱이 훨씬 나쁘고, 이쪽은 한 번의 GET 으로 10년치가 온다.
비공개인 만큼 예고 없이 바뀔 수 있다 — 그래서 parse() 는 어떤 실패도 조용히
넘기지 않는다.
"""

import re
from datetime import date

URL_TEMPLATE = (
    "http://www.smbs.biz/ExRate/StdExRate_xml.jsp?arr_value={code}_{start}_{end}"
)

# value 를 [\d.]+ 로 받으면 value='' 인 행이 정규식에 안 걸려 '없는 행'이 되어
# 조용히 사라진다. 그것이 정확히 devremon 의 사인이므로 [^']* 로 받아서
# 비어 있음을 직접 검사한다.
_SET = re.compile(r"label='(\d{2})\.(\d{2})\.(\d{2})'\s+value='([^']*)'")


class ParseError(Exception):
    """응답이 왔지만 신뢰할 수 있는 환율을 뽑을 수 없음."""


def parse(xml_bytes: bytes) -> list[tuple[date, float]]:
    text = xml_bytes.decode("euc-kr", errors="replace")

    rows: list[tuple[date, float]] = []
    for yy, mm, dd, raw in _SET.findall(text):
        fixing_date = date(2000 + int(yy), int(mm), int(dd))
        if not raw.strip():
            raise ParseError(f"empty rate for {fixing_date.isoformat()}")
        rows.append((fixing_date, float(raw)))

    if not rows:
        raise ParseError("no rate rows found in response")

    rows.sort()
    return rows
