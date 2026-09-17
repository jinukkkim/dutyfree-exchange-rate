# 면세점 환율 기록·공개 사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국 면세점 적용환율을 매일 자동 기록하고, 오늘·내일 확정치와 이력을 광고 없는 정적 사이트로 공개한다.

**Architecture:** VM 크론이 서울외국환중개 XML을 수집해 무결성 검사 후 git의 CSV에 append·push 하고, Vercel이 그 커밋을 받아 Vite 정적 사이트를 빌드한다. 사이트는 런타임에 VM을 건드리지 않으므로 박스가 죽어도 마지막 데이터로 계속 뜬다.

**Tech Stack:** Python 3.12 (httpx, pytest) / React 18 + TypeScript + Vite + Tailwind / Vercel / healthchecks.io

**Spec:** `docs/superpowers/specs/2026-09-18-duty-free-exchange-rate-design.md`
**Domain:** `docs/domain-reference.md` — 용어·법령 근거. 화면 문구는 이 문서의 용어표를 따른다.

## Global Constraints

- Python **3.12**. 의존성은 `httpx`(수집) + `pytest`(테스트)만. 그 외 추가 금지.
- Node **20+**. 차트 라이브러리 금지 — 인라인 SVG로 직접 그린다.
- 모든 스케줄·날짜 계산에 **`Asia/Seoul`** 명시. `datetime.now()` 를 인자 없이 호출하지 않는다.
- 환율 표시는 **소수점 2자리** (`1353.3` → `1,353.30`). 보세판매장 고시 §3④2.
- 화면 문구에 **"고시환율"** 금지(은행 고시환율과 혼동). 기준환율은 항상 **"면세점 기준환율(국산품용)"** 로 표기.
- **빈 값·파싱 실패 시 절대 기록하지 않는다.** 커밋 없이 예외를 던진다.
- 커밋: Conventional Commits `type(scope): subject`. scope 는 `collect` | `web` | `deploy` | `data`. subject 는 영문 명령형, 마침표 없음. **Claude 공동저자 표기 금지.**
- 광고 코드·트래커를 넣지 않는다.

---

## File Structure

```
collector/
  pyproject.toml            의존성·pytest 설정
  src/dfx/
    smbs.py                 서울외국환중개 XML 파싱
    fixing.py               고시일 → 적용일 매핑
    validate.py             무결성 검사
    ssgdfs.py               신세계몰 교차검증 파싱
    store.py                CSV 읽기/upsert/쓰기
    collect.py              일일 수집 엔트리포인트
    backfill.py             2016년 이후 1회성 백필
  tests/
    fixtures/               실제 응답 스냅샷
    test_smbs.py  test_fixing.py  test_validate.py
    test_ssgdfs.py  test_store.py
data/
  rates.csv                 고시일 기준 시계열
  base_rates.csv            면세점 기준환율 변경 이력
  meta.json                 기준환율 마지막 확인일
web/
  src/lib/rates.ts          CSV 파싱 + 적용일 파생
  src/lib/format.ts         숫자 포맷
  src/lib/freshness.ts      신선도 판정
  src/components/           TodayTomorrow / StalenessBanner / RateChart
                            / BaseRateHistory / Glossary
  src/App.tsx
deploy/
  collect.sh                크론이 부르는 래퍼
  crontab.example
```

**책임 분리 원칙**: `smbs.py` 는 파싱만, `fixing.py` 는 날짜 산술만, `validate.py` 는 판정만 한다. 셋 다 I/O 도 상태도 없으므로 픽스처만으로 완전히 테스트된다. I/O 와 오케스트레이션은 `collect.py` 한 곳에 모은다.

---

# Phase 1 — 수집기

이 페이즈만 끝나도 동작하는 소프트웨어다. 아카이브가 매일 쌓이기 시작한다.

---

### Task 1: 리포 스캐폴딩과 smbs XML 파서

**Files:**
- Create: `collector/pyproject.toml`
- Create: `collector/src/dfx/__init__.py`
- Create: `collector/src/dfx/smbs.py`
- Create: `collector/tests/fixtures/smbs_sample.xml`
- Create: `collector/tests/fixtures/smbs_empty_value.xml`
- Test: `collector/tests/test_smbs.py`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `dfx.smbs.ParseError(Exception)`
  - `dfx.smbs.parse(xml_bytes: bytes) -> list[tuple[datetime.date, float]]` — 고시일 오름차순 정렬
  - `dfx.smbs.URL_TEMPLATE: str`

- [ ] **Step 1: 프로젝트 파일 생성**

`collector/pyproject.toml`:

```toml
[project]
name = "dfx"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27"]

[dependency-groups]
dev = ["pytest>=8.0"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

`collector/src/dfx/__init__.py` 는 빈 파일로 생성한다.

- [ ] **Step 2: 픽스처 생성**

`collector/tests/fixtures/smbs_sample.xml` — EUC-KR 로 저장해야 한다. 아래 명령으로 만든다:

```bash
mkdir -p collector/tests/fixtures
python3 - <<'PY'
xml = """<?xml version="1.0" encoding="EUC-KR"?>
<chart caption='기간별 매매기준율' yAxisName='Rate (Won)'>
	<set color='c93749' label='26.09.11' value='1338.2' />
	<set color='c93749' label='26.09.14' value='1346.4' />
	<set color='c93749' label='26.09.15' value='1345.3' />
	<set color='c93749' label='26.09.16' value='1353.3' />
	<set color='c93749' label='26.09.17' value='1368.3' />
</chart>
"""
open('collector/tests/fixtures/smbs_sample.xml','wb').write(xml.encode('euc-kr'))
PY
```

`collector/tests/fixtures/smbs_empty_value.xml` — devremon 이 실제로 내보내던 실패 모양이다:

```bash
python3 - <<'PY'
xml = """<?xml version="1.0" encoding="EUC-KR"?>
<chart caption='기간별 매매기준율'>
	<set color='c93749' label='26.09.16' value='1353.3' />
	<set color='c93749' label='26.09.17' value='' />
</chart>
"""
open('collector/tests/fixtures/smbs_empty_value.xml','wb').write(xml.encode('euc-kr'))
PY
```

- [ ] **Step 3: 실패하는 테스트 작성**

`collector/tests/test_smbs.py`:

```python
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
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `cd collector && python3.12 -m venv .venv && .venv/bin/pip install -e . --group dev -q && .venv/bin/pytest tests/test_smbs.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dfx.smbs'`

- [ ] **Step 5: 구현**

`collector/src/dfx/smbs.py`:

```python
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
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd collector && .venv/bin/pytest tests/test_smbs.py -v`
Expected: 3 passed

- [ ] **Step 7: 커밋**

```bash
git add collector/ && git commit -m "feat(collect): parse Seoul FX broker rate XML"
```

---

### Task 2: 고시일 → 적용일 매핑

이 플랜에서 **가장 값어치 있는 테스트**다. 이 변환이 조용히 틀리면 매일 하루씩
어긋난 값을 몇 달간 기록하게 되고, 데이터가 쌓인 뒤에는 되돌리기 비싸다.

**Files:**
- Create: `collector/src/dfx/fixing.py`
- Test: `collector/tests/test_fixing.py`

**Interfaces:**
- Consumes: 없음 (순수 날짜 산술)
- Produces:
  - `dfx.fixing.fixing_for(fixing_dates: Sequence[date], target: date) -> date | None`
  - `dfx.fixing.KST: zoneinfo.ZoneInfo`
  - `dfx.fixing.today_kst() -> date`

- [ ] **Step 1: 실패하는 테스트 작성**

`collector/tests/test_fixing.py`:

```python
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd collector && .venv/bin/pytest tests/test_fixing.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dfx.fixing'`

- [ ] **Step 3: 구현**

`collector/src/dfx/fixing.py`:

```python
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd collector && .venv/bin/pytest tests/test_fixing.py -v`
Expected: 4 passed

- [ ] **Step 5: 커밋**

```bash
git add collector/ && git commit -m "feat(collect): map fixing dates to applied dates"
```

---

### Task 3: 무결성 검사

**Files:**
- Create: `collector/src/dfx/validate.py`
- Test: `collector/tests/test_validate.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `dfx.validate.ValidationError(Exception)`
  - `dfx.validate.check_range(rate: float, fixing_date: date) -> None` — 범위 밖이면 raise
  - `dfx.validate.is_abnormal_move(previous: float, current: float) -> bool` — raise 하지 않고 플래그용 bool
  - `dfx.validate.MIN_RATE`, `MAX_RATE`, `MAX_DAILY_MOVE`

- [ ] **Step 1: 실패하는 테스트 작성**

`collector/tests/test_validate.py`:

```python
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd collector && .venv/bin/pytest tests/test_validate.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dfx.validate'`

- [ ] **Step 3: 구현**

`collector/src/dfx/validate.py`:

```python
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd collector && .venv/bin/pytest tests/test_validate.py -v`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add collector/ && git commit -m "feat(collect): add integrity checks for collected rates"
```

---

### Task 4: 신세계몰 교차검증 파서

**Files:**
- Create: `collector/src/dfx/ssgdfs.py`
- Create: `collector/tests/fixtures/ssgdfs_main.html`
- Test: `collector/tests/test_ssgdfs.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `dfx.ssgdfs.CrossCheckError(Exception)`
  - `dfx.ssgdfs.parse_today_rate(html: str) -> float`
  - `dfx.ssgdfs.URL: str`

- [ ] **Step 1: 픽스처 생성**

실제 마크업 형태다. `collector/tests/fixtures/ssgdfs_main.html`:

```html
<!DOCTYPE html>
<html lang="ko"><head><title>신세계면세점</title></head>
<body>
<div class="header">
  <ul class="gnb"><li><a href="#">지점안내</a></li></ul>
  <span class="todayRate">오늘의 환율<em>$1 = 1,353.30원</em></span>
  <ul class="utilMenu"><li><a href="#">주문가능시간</a></li></ul>
</div>
</body></html>
```

- [ ] **Step 2: 실패하는 테스트 작성**

`collector/tests/test_ssgdfs.py`:

```python
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd collector && .venv/bin/pytest tests/test_ssgdfs.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dfx.ssgdfs'`

- [ ] **Step 4: 구현**

`collector/src/dfx/ssgdfs.py`:

```python
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd collector && .venv/bin/pytest tests/test_ssgdfs.py -v`
Expected: 2 passed

- [ ] **Step 6: 커밋**

```bash
git add collector/ && git commit -m "feat(collect): parse Shinsegae posted rate for cross-check"
```

---

### Task 5: CSV 저장소

**Files:**
- Create: `collector/src/dfx/store.py`
- Create: `data/rates.csv`
- Test: `collector/tests/test_store.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `dfx.store.Row` — `NamedTuple(fixing_date: date, rate: float, method: str, source: str, collected_at: str)`
  - `dfx.store.RATES_HEADER: list[str]`
  - `dfx.store.read_rates(path: Path) -> list[Row]` — 고시일 오름차순
  - `dfx.store.upsert(existing: list[Row], incoming: list[Row]) -> tuple[list[Row], int]` — `(merged, changed_count)`
  - `dfx.store.write_rates(path: Path, rows: list[Row]) -> None`
  - `dfx.store.method_for(fixing_date: date) -> str` — `"MAR"` | `"TWAP"`

- [ ] **Step 1: 실패하는 테스트 작성**

`collector/tests/test_store.py`:

```python
from datetime import date

from dfx.store import Row, method_for, read_rates, upsert, write_rates

A = Row(date(2026, 9, 16), 1353.3, "MAR", "smbs+ssgdfs", "2026-09-17T09:00:12+09:00")
B = Row(date(2026, 9, 17), 1368.3, "MAR", "smbs", "2026-09-18T09:00:09+09:00")


def test_roundtrip(tmp_path):
    path = tmp_path / "rates.csv"
    write_rates(path, [A, B])
    assert read_rates(path) == [A, B]


def test_read_missing_file_returns_empty(tmp_path):
    assert read_rates(tmp_path / "nope.csv") == []


def test_upsert_adds_new_rows_and_reports_count():
    merged, changed = upsert([A], [B])
    assert merged == [A, B]
    assert changed == 1


def test_upsert_is_noop_when_nothing_changed():
    """매일 10일치를 겹쳐 받으므로 대부분의 날은 변경이 0이어야 한다."""
    merged, changed = upsert([A, B], [A, B])
    assert merged == [A, B]
    assert changed == 0


def test_upsert_overwrites_corrected_value():
    corrected = B._replace(rate=1368.5)
    merged, changed = upsert([A, B], [corrected])
    assert merged == [A, corrected]
    assert changed == 1


def test_upsert_keeps_output_sorted():
    merged, _ = upsert([B], [A])
    assert [r.fixing_date for r in merged] == [A.fixing_date, B.fixing_date]


def test_method_switches_at_2027():
    """매매기준율 산출이 2027-01-01 부터 MAR 에서 TWAP 으로 바뀐다."""
    assert method_for(date(2026, 12, 31)) == "MAR"
    assert method_for(date(2027, 1, 1)) == "TWAP"
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd collector && .venv/bin/pytest tests/test_store.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dfx.store'`

- [ ] **Step 3: 구현**

`collector/src/dfx/store.py`:

```python
"""data/*.csv 읽기·병합·쓰기.

저장 단위는 **고시일**이다. 적용일은 저장하지 않고 fixing.fixing_for() 로
파생한다 — 그래야 주말·공휴일 이월이 데이터가 아니라 규칙이 되고, 공휴일
달력을 관리하지 않아도 된다.

git 에 커밋되는 파일이므로 사람이 diff 로 읽을 수 있어야 한다. 그래서 CSV 이고,
정렬이 안정적이어야 한다 — 순서가 흔들리면 매일 전체 파일이 변경으로 잡힌다.
"""

import csv
from datetime import date
from pathlib import Path
from typing import NamedTuple

RATES_HEADER = ["fix_date", "rate", "method", "source", "collected_at"]

# 외국환거래규정 개정(2027.1.1. 시행)으로 달러-원 매매기준율 산출이
# 시장평균환율(MAR)에서 시간가중평균환율(TWAP)로 바뀐다. 시계열에 방법론 단절이
# 생기므로 데이터가 스스로 그것을 들고 있어야 한다.
TWAP_FROM = date(2027, 1, 1)


class Row(NamedTuple):
    fixing_date: date
    rate: float
    method: str
    source: str
    collected_at: str


def method_for(fixing_date: date) -> str:
    return "TWAP" if fixing_date >= TWAP_FROM else "MAR"


def read_rates(path: Path) -> list[Row]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        rows = [
            Row(
                date.fromisoformat(record["fix_date"]),
                float(record["rate"]),
                record["method"],
                record["source"],
                record["collected_at"],
            )
            for record in csv.DictReader(handle)
        ]
    rows.sort(key=lambda r: r.fixing_date)
    return rows


def upsert(existing: list[Row], incoming: list[Row]) -> tuple[list[Row], int]:
    """incoming 으로 existing 을 갱신하고 (병합 결과, 변경 건수)를 돌려준다.

    수집기는 매일 최근 10일을 겹쳐 받으므로 대부분의 호출은 변경 0 이다.
    변경이 0 이면 호출자가 커밋을 건너뛴다.
    """
    merged = {row.fixing_date: row for row in existing}
    changed = 0
    for row in incoming:
        if merged.get(row.fixing_date) != row:
            merged[row.fixing_date] = row
            changed += 1
    return [merged[key] for key in sorted(merged)], changed


def write_rates(path: Path, rows: list[Row]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(RATES_HEADER)
        for row in rows:
            writer.writerow(
                [
                    row.fixing_date.isoformat(),
                    f"{row.rate:g}",
                    row.method,
                    row.source,
                    row.collected_at,
                ]
            )
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd collector && .venv/bin/pytest tests/test_store.py -v`
Expected: 7 passed

- [ ] **Step 5: 빈 데이터 파일 생성**

```bash
mkdir -p data
printf 'fix_date,rate,method,source,collected_at\n' > data/rates.csv
```

- [ ] **Step 6: 커밋**

```bash
git add collector/ data/ && git commit -m "feat(collect): add CSV store for rate series"
```

---

### Task 6: 수집 엔트리포인트와 백필

**Files:**
- Create: `collector/src/dfx/collect.py`
- Create: `collector/src/dfx/backfill.py`
- Modify: `collector/tests/test_store.py` (변경 없음 — 회귀 확인용으로만 재실행)

**Interfaces:**
- Consumes:
  - `dfx.smbs.parse`, `dfx.smbs.URL_TEMPLATE`, `dfx.smbs.ParseError`
  - `dfx.ssgdfs.parse_today_rate`, `dfx.ssgdfs.URL`, `dfx.ssgdfs.CrossCheckError`
  - `dfx.fixing.fixing_for`, `dfx.fixing.today_kst`, `dfx.fixing.KST`
  - `dfx.validate.check_range`, `dfx.validate.is_abnormal_move`
  - `dfx.store.Row`, `read_rates`, `upsert`, `write_rates`, `method_for`
- Produces:
  - `dfx.collect.fetch_window(client, start: date, end: date) -> list[tuple[date, float]]`
  - `dfx.collect.cross_check(client, rows, today) -> bool` — 일치하면 True, 검증 불가·불일치면 False
  - `dfx.collect.main() -> int` — 프로세스 종료코드

- [ ] **Step 1: 수집기 구현**

`collector/src/dfx/collect.py`:

```python
"""일일 수집 엔트리포인트. KST 09:00 크론이 호출한다.

매매기준율은 영업일 08:00 에 한 번 고시되고 그날 안에 바뀌지 않으므로 하루 한 번이면
충분하다. 09:00 은 고시 후 한 시간의 여유다.

하루치가 아니라 최근 10일을 겹쳐 받는다. 장애나 연휴로 빠진 날이 자동으로 메워지고,
과거 값이 정정되면 그때 드러난다.
"""

import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import httpx

from dfx import smbs, ssgdfs
from dfx.fixing import KST, fixing_for, today_kst
from dfx.store import Row, method_for, read_rates, upsert, write_rates
from dfx.validate import ValidationError, check_range, is_abnormal_move

REPO_ROOT = Path(__file__).resolve().parents[3]
RATES_PATH = REPO_ROOT / "data" / "rates.csv"

OVERLAP_DAYS = 10
STALE_AFTER_DAYS = 7  # 한국 최장 연휴가 설·추석 + 주말로 5일 안팎이다
TIMEOUT = httpx.Timeout(45.0)
HEADERS = {"User-Agent": "duty-free-exchange-rate/1.0 (+https://github.com)"}


def fetch_window(client: httpx.Client, start: date, end: date) -> list[tuple[date, float]]:
    url = smbs.URL_TEMPLATE.format(
        code="USD", start=start.isoformat(), end=end.isoformat()
    )
    response = client.get(url, headers={**HEADERS, "X-Requested-With": "XMLHttpRequest"})
    response.raise_for_status()
    return smbs.parse(response.content)


def cross_check(client: httpx.Client, rows: list[tuple[date, float]], today: date) -> bool:
    """신세계가 게시한 당일 적용환율이 우리 매핑과 일치하는지 본다.

    실패해도 예외를 올리지 않는다. 검증 소스이지 1차 소스가 아니다.
    """
    expected_fixing = fixing_for([d for d, _ in rows], today)
    if expected_fixing is None:
        return False
    expected = dict(rows)[expected_fixing]

    try:
        response = client.get(ssgdfs.URL, headers=HEADERS, follow_redirects=True)
        response.raise_for_status()
        posted = ssgdfs.parse_today_rate(response.text)
    except (httpx.HTTPError, ssgdfs.CrossCheckError) as exc:
        print(f"WARN cross-check unavailable: {exc}", file=sys.stderr)
        return False

    if abs(posted - expected) > 0.005:
        print(
            f"WARN cross-check mismatch: ssgdfs={posted} smbs={expected} "
            f"(fixing {expected_fixing.isoformat()})",
            file=sys.stderr,
        )
        return False
    return True


def main() -> int:
    today = today_kst()
    collected_at = datetime.now(KST).isoformat(timespec="seconds")

    with httpx.Client(timeout=TIMEOUT) as client:
        try:
            fetched = fetch_window(client, today - timedelta(days=OVERLAP_DAYS), today)
        except (httpx.HTTPError, smbs.ParseError) as exc:
            print(f"FATAL collection failed: {exc}", file=sys.stderr)
            return 1

        verified = cross_check(client, fetched, today)

    source = "smbs+ssgdfs" if verified else "smbs"
    existing = read_rates(RATES_PATH)
    known = {row.fixing_date: row.rate for row in existing}

    incoming: list[Row] = []
    for fixing_date, rate in fetched:
        try:
            check_range(rate, fixing_date)
        except ValidationError as exc:
            print(f"FATAL {exc}", file=sys.stderr)
            return 1

        previous = known.get(fixing_date - timedelta(days=1))
        if previous is not None and is_abnormal_move(previous, rate):
            print(
                f"WARN abnormal move on {fixing_date.isoformat()}: "
                f"{previous} -> {rate}",
                file=sys.stderr,
            )

        incoming.append(
            Row(fixing_date, rate, method_for(fixing_date), source, collected_at)
        )

    merged, changed = upsert(existing, incoming)

    latest = merged[-1].fixing_date
    if (today - latest).days > STALE_AFTER_DAYS:
        print(
            f"WARN data stale: latest fixing {latest.isoformat()} is "
            f"{(today - latest).days} days old",
            file=sys.stderr,
        )

    if changed == 0:
        print(f"no change (latest fixing {latest.isoformat()})")
        return 0

    write_rates(RATES_PATH, merged)
    subprocess.run(["git", "add", str(RATES_PATH)], cwd=REPO_ROOT, check=True)
    subprocess.run(
        ["git", "commit", "-m", f"data(collect): rates through {latest.isoformat()}"],
        cwd=REPO_ROOT,
        check=True,
    )
    subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True)
    print(f"committed {changed} row(s), latest fixing {latest.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 백필 스크립트 구현**

`collector/src/dfx/backfill.py`:

```python
"""2016년 이후 전체 이력을 한 번에 받아 채운다. 1회성 스크립트다.

같은 엔드포인트가 2,637 영업일(약 160KB)을 단일 요청으로 돌려준다.
이후로는 collect.py 의 일별 수집에 맡긴다.
"""

import sys
from datetime import date, datetime

import httpx

from dfx.collect import RATES_PATH, TIMEOUT, fetch_window
from dfx.fixing import KST, today_kst
from dfx.store import Row, method_for, read_rates, upsert, write_rates
from dfx.validate import check_range

START = date(2016, 1, 1)


def main() -> int:
    collected_at = datetime.now(KST).isoformat(timespec="seconds")
    with httpx.Client(timeout=TIMEOUT) as client:
        fetched = fetch_window(client, START, today_kst())

    for fixing_date, rate in fetched:
        check_range(rate, fixing_date)

    incoming = [
        Row(d, rate, method_for(d), "smbs", collected_at) for d, rate in fetched
    ]
    merged, changed = upsert(read_rates(RATES_PATH), incoming)
    write_rates(RATES_PATH, merged)
    print(f"backfilled {changed} row(s), {len(merged)} total", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 3: 전체 테스트 재실행**

Run: `cd collector && .venv/bin/pytest -v`
Expected: 21 passed (Task 1~5 의 테스트 전부)

- [ ] **Step 4: 백필 실행**

Run: `cd collector && .venv/bin/python -m dfx.backfill`
Expected: stderr 에 `backfilled 2600+ row(s)` 대. `data/rates.csv` 가 2,600행 이상.

검증:

```bash
wc -l data/rates.csv
head -2 data/rates.csv
tail -2 data/rates.csv
grep -c ',,' data/rates.csv || echo "빈 필드 없음"
```

- [ ] **Step 5: 수집기 1회 수동 실행**

Run: `cd collector && .venv/bin/python -m dfx.collect`
Expected: `no change (latest fixing ...)` — 백필 직후이므로 변경이 없어야 한다. 이것이 upsert 의 멱등성 확인이다.

- [ ] **Step 6: 커밋**

```bash
git add collector/ data/ && git commit -m "feat(collect): add daily collector and historical backfill"
```

---

### Task 7: 크론 설치와 데드맨 스위치

**Files:**
- Create: `deploy/collect.sh`
- Create: `deploy/crontab.example`
- Create: `deploy/README.md`

**Interfaces:**
- Consumes: `dfx.collect` 모듈
- Produces: 없음 (운영 산출물)

- [ ] **Step 1: 래퍼 스크립트 작성**

`deploy/collect.sh`:

```bash
#!/usr/bin/env bash
# KST 09:00 크론이 부른다. 매매기준율은 영업일 08:00 에 한 번 고시되고 그날 안에
# 바뀌지 않으므로, 한 시간 여유를 두고 하루 한 번이면 충분하다.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/duty-free-exchange-rate}"
HEALTHCHECK_FILE="${HEALTHCHECK_FILE:-/home/ubuntu/.dfx_healthcheck}"

cd "$APP_DIR"

# 로컬 커밋이 쌓여 있으면 push 가 거부되므로 먼저 맞춘다. 데이터는 이 박스만
# 쓰지만, 사람이 GitHub 에서 base_rates.csv 를 고칠 수 있다.
git pull --rebase --quiet

"$APP_DIR/collector/.venv/bin/python" -m dfx.collect

# 죽은 크론은 스스로 신고하지 못한다. 성공했을 때만 신호를 보내고, 신호가
# 끊기면 healthchecks.io 가 메일을 보낸다. 이 ping 의 뜻은 "수집기가 정상
# 동작했다"이지 "새 고시가 있었다"가 아니다 — 주말·공휴일에도 ping 한다.
#
# 토큰을 크론 줄에 인라인으로 쓰지 않는 이유: cron 은 실행한 명령을 저널에
# 그대로 남기므로 자격증명의 영구 사본이 생긴다.
if [ -r "$HEALTHCHECK_FILE" ]; then
	# shellcheck source=/dev/null
	. "$HEALTHCHECK_FILE"
	curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" > /dev/null
else
	echo "missing $HEALTHCHECK_FILE — see deploy/README.md" >&2
fi
```

```bash
chmod +x deploy/collect.sh
```

- [ ] **Step 2: crontab 예시 작성**

`deploy/crontab.example`:

```cron
# 이 박스는 Etc/UTC 로 돈다. cron 에는 CRON_TZ 가 없으므로 스케줄은 UTC 로 쓰고
# 환산을 주석에 남긴다. 한국은 서머타임이 없어 KST = UTC+9 가 영구 고정이므로
# 하드코딩해도 안전하다.
#
# 00:00 UTC = 09:00 KST — 매매기준율 고시(08:00 KST) 한 시간 뒤.
0 0 * * * /home/ubuntu/duty-free-exchange-rate/deploy/collect.sh >> /home/ubuntu/dfx.log 2>&1
```

- [ ] **Step 3: 운영 문서 작성**

`deploy/README.md`:

```markdown
# 운영

## 설치

```bash
git clone <repo> /home/ubuntu/duty-free-exchange-rate
cd /home/ubuntu/duty-free-exchange-rate/collector
python3.12 -m venv .venv
.venv/bin/pip install -e .
```

git push 자격증명은 deploy key 로 설정한다.

## 데드맨 스위치

healthchecks.io 에서 일간 체크를 만들고 URL 을 파일에 둔다. 크론 줄에 인라인으로
쓰면 cron 이 저널에 명령 전체를 남겨 자격증명의 영구 사본이 생긴다.

```bash
echo 'HEALTHCHECK_URL=https://hc-ping.com/<uuid>' > /home/ubuntu/.dfx_healthcheck
chmod 600 /home/ubuntu/.dfx_healthcheck
```

Grace period 는 36시간으로 잡는다. 하루 한 번 도는 크론이 한 번 건너뛰어도
즉시 울리지 않되, 이틀 연속 실패는 잡는다.

## 크론

```bash
crontab -e   # deploy/crontab.example 내용을 붙여넣는다
```

## 백업

데이터가 git 에 있으므로 GitHub 와 모든 클론이 백업이다. 스냅샷과 달리 변경
이력까지 남으므로 별도 백업 작업은 없다.

## 로그

- 수집기 실행: `/home/ubuntu/dfx.log`
- 데이터 변경 이력: `git log -- data/`
```

- [ ] **Step 4: 문법 검사**

Run: `bash -n deploy/collect.sh && shellcheck deploy/collect.sh || true`
Expected: 문법 오류 없음 (shellcheck 미설치면 건너뛴다)

- [ ] **Step 5: 커밋**

```bash
git add deploy/ && git commit -m "feat(deploy): add collection cron wrapper and dead-man switch"
```

---

# Phase 2 — 사이트

---

### Task 8: 프론트 스캐폴딩과 데이터 로딩

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`
- Create: `web/tailwind.config.js`, `web/postcss.config.js`, `web/src/index.css`
- Create: `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`
- Create: `web/src/lib/rates.ts`, `web/src/lib/format.ts`
- Test: `web/src/lib/rates.test.ts`, `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: `data/rates.csv` (Task 5·6 산출)
- Produces:
  - `web/src/lib/rates.ts`
    - `type Rate = { fixingDate: string; rate: number; method: "MAR" | "TWAP"; source: string; collectedAt: string }`
    - `parseRates(csv: string): Rate[]` — 고시일 오름차순
    - `appliedOn(rates: Rate[], targetISO: string): Rate | null`
  - `web/src/lib/format.ts`
    - `formatRate(rate: number): string` — `1353.3` → `"1,353.30"`
    - `formatKrw(won: number): string`

- [ ] **Step 1: 스캐폴딩 생성**

```bash
mkdir -p web/src/lib web/src/components
cd web
npm init -y
npm i react@^18 react-dom@^18
npm i -D vite@^5 @vitejs/plugin-react@^4 typescript@^5 @types/react @types/react-dom \
        tailwindcss@^3 postcss autoprefixer vitest@^2 jsdom
```

`web/package.json` 의 `scripts` 를 다음으로 교체한다:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

`web/vite.config.ts`:

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // data/ 는 리포 루트에 있고 web/ 바깥이다. ?raw 임포트를 허용하려면 필요하다.
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom" },
})
```

`web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

`web/tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

`web/postcss.config.js`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

`web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`web/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>면세점 적용환율 — 오늘과 내일</title>
    <meta
      name="description"
      content="면세점 적용환율의 오늘·내일 확정치와 이력. 내일 환율은 예측이 아니라 오늘 08시에 고시된 사실입니다."
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`web/src/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: 실패하는 테스트 작성**

`web/src/lib/format.test.ts`:

```ts
import { expect, test } from "vitest"

import { formatKrw, formatRate } from "./format"

test("환율은 소수점 2자리로 표시한다", () => {
  // 보세판매장 고시 §3④2: 소수점 이하 3자리에서 버린 후 2자리까지 표시
  expect(formatRate(1353.3)).toBe("1,353.30")
  expect(formatRate(1368)).toBe("1,368.00")
  expect(formatRate(985.5)).toBe("985.50")
})

test("원화 금액은 정수로 표시한다", () => {
  expect(formatKrw(4500)).toBe("4,500원")
  expect(formatKrw(4500.4)).toBe("4,500원")
})
```

`web/src/lib/rates.test.ts`:

```ts
import { expect, test } from "vitest"

import { appliedOn, parseRates } from "./rates"

const CSV = `fix_date,rate,method,source,collected_at
2026-09-11,1338.2,MAR,smbs,2026-09-12T09:00:00+09:00
2026-09-14,1346.4,MAR,smbs,2026-09-15T09:00:00+09:00
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`

test("CSV 를 고시일 오름차순으로 파싱한다", () => {
  const rates = parseRates(CSV)
  expect(rates).toHaveLength(4)
  expect(rates[0].fixingDate).toBe("2026-09-11")
  expect(rates[0].rate).toBe(1338.2)
  expect(rates[3].method).toBe("MAR")
})

test("주말에는 금요일 고시가 이어진다", () => {
  const rates = parseRates(CSV)
  for (const day of ["2026-09-12", "2026-09-13", "2026-09-14"]) {
    expect(appliedOn(rates, day)?.rate).toBe(1338.2)
  }
})

test("당일 고시가 아니라 직전 고시가 적용된다", () => {
  const rates = parseRates(CSV)
  expect(appliedOn(rates, "2026-09-17")?.rate).toBe(1353.3)
  expect(appliedOn(rates, "2026-09-18")?.rate).toBe(1368.3)
})

test("어떤 고시보다도 앞선 날짜는 null", () => {
  expect(appliedOn(parseRates(CSV), "2026-09-11")).toBeNull()
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd web && npm test`
Expected: FAIL — `Failed to resolve import "./format"` 및 `"./rates"`

- [ ] **Step 4: 구현**

`web/src/lib/format.ts`:

```ts
/** 보세판매장 고시 §3④2 에 따라 환율은 소수점 2자리로 표시한다. */
export function formatRate(rate: number): string {
  const [whole, fraction] = rate.toFixed(2).split(".")
  return `${Number(whole).toLocaleString("ko-KR")}.${fraction}`
}

export function formatKrw(won: number): string {
  return `${Math.round(won).toLocaleString("ko-KR")}원`
}
```

`web/src/lib/rates.ts`:

```ts
export type Rate = {
  fixingDate: string // YYYY-MM-DD, 고시일 (적용일이 아니다)
  rate: number
  method: "MAR" | "TWAP"
  source: string
  collectedAt: string
}

export function parseRates(csv: string): Rate[] {
  const lines = csv.trim().split("\n")
  const rows = lines.slice(1).filter((line) => line.trim() !== "")

  return rows
    .map((line) => {
      const [fixingDate, rate, method, source, collectedAt] = line.split(",")
      return {
        fixingDate,
        rate: Number(rate),
        method: method as Rate["method"],
        source,
        collectedAt,
      }
    })
    .sort((a, b) => a.fixingDate.localeCompare(b.fixingDate))
}

/**
 * targetISO 일에 적용되는 환율.
 *
 * 고시일 D 의 값은 D+1 부터 다음 고시일까지 적용되므로, target 보다 **앞선**
 * 고시일 중 가장 늦은 것이 답이다. 주말·공휴일 이월이 여기서 저절로 처리되며,
 * 그래서 공휴일 달력이 필요 없다. 수집기의 dfx/fixing.py 와 같은 규칙이다.
 */
export function appliedOn(rates: Rate[], targetISO: string): Rate | null {
  let found: Rate | null = null
  for (const rate of rates) {
    if (rate.fixingDate < targetISO) found = rate
    else break
  }
  return found
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd web && npm test`
Expected: 6 passed

- [ ] **Step 6: 커밋**

```bash
git add web/ && git commit -m "feat(web): scaffold Vite app with rate parsing and formatting"
```

---

### Task 9: 첫 화면 — 오늘과 내일

**Files:**
- Create: `web/src/components/TodayTomorrow.tsx`
- Modify: `web/src/App.tsx`
- Test: `web/src/components/TodayTomorrow.test.tsx`

**Interfaces:**
- Consumes: `Rate`, `appliedOn`, `formatRate`, `formatKrw`
- Produces: `TodayTomorrow({ rates, today }: { rates: Rate[]; today: string })`

- [ ] **Step 1: 테스트 의존성 추가**

```bash
cd web && npm i -D @testing-library/react @testing-library/jest-dom
```

`web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"
```

`web/vite.config.ts` 의 `test` 를 다음으로 교체:

```ts
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
```

- [ ] **Step 2: 실패하는 테스트 작성**

`web/src/components/TodayTomorrow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import { parseRates } from "../lib/rates"
import TodayTomorrow from "./TodayTomorrow"

const CSV = `fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`

test("오늘과 내일 적용환율을 2자리로 보여준다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText("1,368.30")).toBeInTheDocument()
})

test("차이를 금액으로 환산해 보여준다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  // (1368.3 - 1353.3) * 300 = 4,500원
  expect(screen.getByText(/4,500원/)).toBeInTheDocument()
})

test("내일 값이 예측이 아님을 명시한다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText(/예측이 아니라/)).toBeInTheDocument()
})

test("내일 고시가 아직 없으면 오늘만 보여준다", () => {
  const partial = parseRates(`fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
`)
  render(<TodayTomorrow rates={partial} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText(/아직 고시되지 않았습니다/)).toBeInTheDocument()
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd web && npm test`
Expected: FAIL — `Failed to resolve import "./TodayTomorrow"`

- [ ] **Step 4: 구현**

`web/src/components/TodayTomorrow.tsx`:

```tsx
import { useState } from "react"

import { formatKrw, formatRate } from "../lib/format"
import { appliedOn, type Rate } from "../lib/rates"

const DEFAULT_BASIS = 300

function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function TodayTomorrow({
  rates,
  today,
}: {
  rates: Rate[]
  today: string
}) {
  const [basis, setBasis] = useState(DEFAULT_BASIS)

  const todayRate = appliedOn(rates, today)
  const tomorrowRate = appliedOn(rates, nextDay(today))

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null

  return (
    <section className="px-4 py-10">
      <h1 className="text-center text-base font-medium text-slate-500">
        면세점 적용환율
      </h1>

      <div className="mx-auto mt-6 flex max-w-md justify-center gap-10">
        <div className="text-center">
          <div className="text-sm text-slate-500">오늘</div>
          <div className="text-3xl font-semibold tabular-nums">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-slate-500">내일</div>
          {tomorrowRate ? (
            <>
              <div className="text-3xl font-semibold tabular-nums">
                {formatRate(tomorrowRate.rate)}
              </div>
              {delta !== null && delta !== 0 && (
                <div
                  className={
                    delta > 0
                      ? "mt-1 text-sm text-rose-600 tabular-nums"
                      : "mt-1 text-sm text-blue-600 tabular-nums"
                  }
                >
                  {delta > 0 ? "▲" : "▼"} {formatRate(Math.abs(delta))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 text-sm text-slate-400">
              아직 고시되지 않았습니다
            </div>
          )}
        </div>
      </div>

      {delta !== null && delta !== 0 && (
        <p className="mt-6 text-center text-slate-700">
          내일은 오늘보다 {delta > 0 ? "비쌉니다" : "쌉니다"}.{" "}
          <label>
            $
            <input
              type="number"
              value={basis}
              min={1}
              onChange={(event) => setBasis(Number(event.target.value) || 1)}
              className="w-20 rounded border border-slate-300 px-1 text-center tabular-nums"
              aria-label="기준 금액(달러)"
            />{" "}
            기준 약 {formatKrw(Math.abs(delta) * basis)}{" "}
            {delta > 0 ? "더" : "덜"}.
          </label>
        </p>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        ※ 내일 값은 예측이 아니라 오늘 08:00 에 고시된 매매기준율입니다.
      </p>
    </section>
  )
}
```

`web/src/App.tsx`:

```tsx
import ratesCsv from "../../data/rates.csv?raw"

import TodayTomorrow from "./components/TodayTomorrow"
import { parseRates } from "./lib/rates"

// 전량이 100KB 수준이라 번들에 싣는다. fetch 폭포와 로딩 상태가 사라지고,
// "두 숫자"가 첫 페인트에 이미 들어 있다.
const rates = parseRates(ratesCsv)

/** KST 기준 오늘 날짜. 방문자의 타임존과 무관하게 한국 날짜여야 한다. */
function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export default function App() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-slate-900">
      <TodayTomorrow rates={rates} today={todayKst()} />
    </main>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd web && npm test`
Expected: 10 passed

- [ ] **Step 6: 개발 서버로 눈으로 확인**

Run: `cd web && npm run dev`
Expected: 첫 화면에 두 숫자가 스크롤 없이 보인다. 광고·캐러셀 없음.

- [ ] **Step 7: 커밋**

```bash
git add web/ && git commit -m "feat(web): show today and tomorrow applied rates"
```

---

### Task 10: 신선도 배너

**Files:**
- Create: `web/src/lib/freshness.ts`
- Create: `web/src/components/StalenessBanner.tsx`
- Modify: `web/src/App.tsx`
- Test: `web/src/lib/freshness.test.ts`

**Interfaces:**
- Consumes: `Rate`
- Produces:
  - `isStale(latestCollectedAt: string, now: Date): boolean`
  - `STALE_AFTER_HOURS: number`
  - `StalenessBanner({ rates, now }: { rates: Rate[]; now: Date })`

- [ ] **Step 1: 실패하는 테스트 작성**

`web/src/lib/freshness.test.ts`:

```ts
import { expect, test } from "vitest"

import { isStale } from "./freshness"

const COLLECTED = "2026-09-18T09:00:00+09:00"

test("방금 수집된 데이터는 신선하다", () => {
  expect(isStale(COLLECTED, new Date("2026-09-18T10:00:00+09:00"))).toBe(false)
})

test("주말을 건너뛴 정도는 신선하다", () => {
  // 금요일 수집 후 월요일 방문. 크론은 매일 돌지만 여유를 둔다.
  expect(isStale(COLLECTED, new Date("2026-09-20T12:00:00+09:00"))).toBe(false)
})

test("사흘 넘게 갱신이 없으면 낡은 것으로 본다", () => {
  expect(isStale(COLLECTED, new Date("2026-09-22T12:00:00+09:00"))).toBe(true)
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd web && npm test`
Expected: FAIL — `Failed to resolve import "./freshness"`

- [ ] **Step 3: 구현**

`web/src/lib/freshness.ts`:

```ts
/**
 * 사이트가 스스로 자기 신선도를 판정한다.
 *
 * 서버도 헬스 엔드포인트도 없지만, 마지막 수집 시각을 현재 시각과 비교하는 것만으로
 * 방문자에게 낡음을 알릴 수 있다. 낡은 데이터를 멀쩡한 척 보여주는 것이 이 분야에서
 * 제일 나쁜 실패다 — devremon 은 깨진 빈 차트를 몇 달째 띄우고 있다.
 *
 * 운영자용 경보는 별개다(healthchecks.io 데드맨 스위치). 이쪽은 방문자용이다.
 */
export const STALE_AFTER_HOURS = 72

export function isStale(latestCollectedAt: string, now: Date): boolean {
  const collected = new Date(latestCollectedAt).getTime()
  if (Number.isNaN(collected)) return true
  return now.getTime() - collected > STALE_AFTER_HOURS * 3600 * 1000
}
```

`web/src/components/StalenessBanner.tsx`:

```tsx
import { isStale } from "../lib/freshness"
import type { Rate } from "../lib/rates"

export default function StalenessBanner({
  rates,
  now,
}: {
  rates: Rate[]
  now: Date
}) {
  const latest = rates.at(-1)
  if (!latest || !isStale(latest.collectedAt, now)) return null

  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-900"
    >
      ⚠ 이 데이터는 {latest.collectedAt.slice(0, 10)} 이후 갱신되지 않았습니다.
    </div>
  )
}
```

`web/src/App.tsx` 에서 `<main>` 바로 안, `<TodayTomorrow ... />` 앞에 추가하고
import 를 더한다:

```tsx
import StalenessBanner from "./components/StalenessBanner"
```

```tsx
      <StalenessBanner rates={rates} now={new Date()} />
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd web && npm test`
Expected: 13 passed

- [ ] **Step 5: 커밋**

```bash
git add web/ && git commit -m "feat(web): warn visitors when data has gone stale"
```

---

### Task 11: 시계열 차트

**Files:**
- Create: `web/src/components/RateChart.tsx`
- Modify: `web/src/App.tsx`
- Test: `web/src/components/RateChart.test.tsx`

**Interfaces:**
- Consumes: `Rate`, `formatRate`
- Produces: `RateChart({ rates }: { rates: Rate[] })`

- [ ] **Step 1: 실패하는 테스트 작성**

`web/src/components/RateChart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import type { Rate } from "../lib/rates"
import RateChart from "./RateChart"

function make(fixingDate: string, rate: number, method: Rate["method"] = "MAR"): Rate {
  return { fixingDate, rate, method, source: "smbs", collectedAt: `${fixingDate}T09:00:00+09:00` }
}

const RATES = [
  make("2026-09-14", 1346.4),
  make("2026-09-15", 1345.3),
  make("2026-09-16", 1353.3),
  make("2026-09-17", 1368.3),
]

test("데이터 포인트만큼 선을 그린다", () => {
  const { container } = render(<RateChart rates={RATES} />)
  const path = container.querySelector("path[data-testid='rate-line']")

  expect(path).toBeTruthy()
  // M x y L x y L x y L x y → 좌표쌍 4개
  expect(path!.getAttribute("d")!.match(/[ML]/g)).toHaveLength(4)
})

test("기간 선택 버튼을 제공한다", () => {
  render(<RateChart rates={RATES} />)
  expect(screen.getByRole("button", { name: "1개월" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "전체" })).toBeInTheDocument()
})

test("MAR 과 TWAP 경계에서 선을 끊는다", () => {
  const spanning = [make("2026-12-31", 1400), make("2027-01-02", 1390, "TWAP")]
  const { container } = render(<RateChart rates={spanning} />)

  // 방법론이 다르면 같은 선으로 잇지 않는다 → 두 개의 path
  expect(container.querySelectorAll("path[data-testid='rate-line']")).toHaveLength(2)
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd web && npm test`
Expected: FAIL — `Failed to resolve import "./RateChart"`

- [ ] **Step 3: 구현**

`web/src/components/RateChart.tsx`:

```tsx
import { useMemo, useState } from "react"

import { formatRate } from "../lib/format"
import type { Rate } from "../lib/rates"

const RANGES = [
  { label: "1개월", days: 30 },
  { label: "1년", days: 365 },
  { label: "전체", days: Number.POSITIVE_INFINITY },
] as const

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

/** 방법론이 바뀌는 지점에서 끊는다. MAR 과 TWAP 은 같은 선으로 이으면 안 된다. */
function splitByMethod(rates: Rate[]): Rate[][] {
  const segments: Rate[][] = []
  for (const rate of rates) {
    const last = segments.at(-1)
    if (last && last[0].method === rate.method) last.push(rate)
    else segments.push([rate])
  }
  return segments
}

export default function RateChart({ rates }: { rates: Rate[] }) {
  const [days, setDays] = useState<number>(RANGES[0].days)

  const visible = useMemo(
    () => (Number.isFinite(days) ? rates.slice(-days) : rates),
    [rates, days],
  )

  const { min, max } = useMemo(() => {
    const values = visible.map((r) => r.rate)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [visible])

  if (visible.length < 2) return null

  const span = max - min || 1
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom

  const x = (index: number) =>
    PAD.left + (index / (visible.length - 1)) * innerWidth
  const y = (rate: number) =>
    PAD.top + (1 - (rate - min) / span) * innerHeight

  let cursor = 0
  const segments = splitByMethod(visible).map((segment) => {
    const start = cursor
    cursor += segment.length
    return segment
      .map((rate, offset) => `${offset === 0 ? "M" : "L"}${x(start + offset).toFixed(1)} ${y(rate.rate).toFixed(1)}`)
      .join(" ")
  })

  return (
    <section className="px-4 py-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-medium text-slate-700">적용환율 추이</h2>
        <div className="flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setDays(range.days)}
              className={
                days === range.days
                  ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                  : "rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              }
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`적용환율 추이, 최저 ${formatRate(min)} 최고 ${formatRate(max)}`}
      >
        <text x={4} y={PAD.top + 4} className="fill-slate-400 text-[10px]">
          {formatRate(max)}
        </text>
        <text x={4} y={HEIGHT - PAD.bottom} className="fill-slate-400 text-[10px]">
          {formatRate(min)}
        </text>
        {segments.map((d, index) => (
          <path
            key={index}
            data-testid="rate-line"
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-slate-800"
          />
        ))}
      </svg>
    </section>
  )
}
```

`web/src/App.tsx` 에 import 와 `<RateChart rates={rates} />` 를 `<TodayTomorrow ... />` 아래에 추가한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd web && npm test`
Expected: 16 passed

- [ ] **Step 5: 커밋**

```bash
git add web/ && git commit -m "feat(web): chart the applied-rate series with method breaks"
```

---

### Task 12: 기준환율 이력과 용어 설명

**Files:**
- Create: `data/base_rates.csv`, `data/meta.json`
- Create: `web/src/lib/baseRates.ts`
- Create: `web/src/components/BaseRateHistory.tsx`
- Create: `web/src/components/Glossary.tsx`
- Modify: `web/src/App.tsx`
- Test: `web/src/lib/baseRates.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type BaseRate = { operator: string; effectiveDate: string; rate: number | null; status: "confirmed" | "unconfirmed"; sourceUrl: string; note: string }`
  - `parseBaseRates(csv: string): BaseRate[]` — 적용일 내림차순
  - `OPERATOR_LABELS: Record<string, string>`

- [ ] **Step 1: 데이터 파일 생성**

`data/base_rates.csv` — 값은 Task 15 에서 확정한다. 지금은 헤더와 스키마만 둔다:

```bash
printf 'operator,effective_date,rate,status,source_url,note\n' > data/base_rates.csv
printf '{\n  "base_rates_verified_at": "2026-09-18"\n}\n' > data/meta.json
```

- [ ] **Step 2: 실패하는 테스트 작성**

`web/src/lib/baseRates.test.ts`:

```ts
import { expect, test } from "vitest"

import { parseBaseRates } from "./baseRates"

const CSV = `operator,effective_date,rate,status,source_url,note
lotte,2026-07-08,1500,confirmed,https://example.com/a,
shinsegae,2026-07-09,1500,confirmed,https://example.com/b,
lotte,2026-09-09,,unconfirmed,,값 미확정
`

test("적용일 내림차순으로 파싱한다", () => {
  const rows = parseBaseRates(CSV)
  expect(rows[0].effectiveDate).toBe("2026-09-09")
  expect(rows[2].effectiveDate).toBe("2026-07-08")
})

test("미확정 행의 값은 null 로 둔다", () => {
  const rows = parseBaseRates(CSV)
  expect(rows[0].rate).toBeNull()
  expect(rows[0].status).toBe("unconfirmed")
})

test("확정 행은 숫자를 갖는다", () => {
  const rows = parseBaseRates(CSV)
  expect(rows[1].rate).toBe(1500)
  expect(rows[1].operator).toBe("shinsegae")
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd web && npm test`
Expected: FAIL — `Failed to resolve import "./baseRates"`

- [ ] **Step 4: 구현**

`web/src/lib/baseRates.ts`:

```ts
export type BaseRate = {
  operator: string
  effectiveDate: string
  rate: number | null
  status: "confirmed" | "unconfirmed"
  sourceUrl: string
  note: string
}

export const OPERATOR_LABELS: Record<string, string> = {
  lotte: "롯데",
  shilla: "신라",
  shinsegae: "신세계",
  hyundai: "현대",
}

export function parseBaseRates(csv: string): BaseRate[] {
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [operator, effectiveDate, rate, status, sourceUrl, note = ""] =
        line.split(",")
      return {
        operator,
        effectiveDate,
        // 미확정은 빈 값으로 둔다. 추정치를 확정인 척 넣으면 기록이 오염된다.
        rate: rate.trim() === "" ? null : Number(rate),
        status: status as BaseRate["status"],
        sourceUrl,
        note,
      }
    })
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
}
```

`web/src/components/BaseRateHistory.tsx`:

```tsx
import { OPERATOR_LABELS, type BaseRate } from "../lib/baseRates"

export default function BaseRateHistory({
  history,
  verifiedAt,
}: {
  history: BaseRate[]
  verifiedAt: string
}) {
  return (
    <section className="px-4 py-8">
      <h2 className="text-base font-medium text-slate-700">
        면세점 기준환율(국산품용) 변경 이력
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        국산 브랜드의 달러 표시가를 정할 때 쓰는 면세점 자체 환율입니다. 위의
        적용환율과는 다른 값이며, 수입 브랜드에는 적용되지 않습니다.
      </p>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">아직 기록된 변경이 없습니다.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-1">적용일</th>
              <th className="py-1">면세점</th>
              <th className="py-1 text-right">기준환율</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={`${row.operator}-${row.effectiveDate}`} className="border-b">
                <td className="py-1 tabular-nums">{row.effectiveDate}</td>
                <td className="py-1">
                  {OPERATOR_LABELS[row.operator] ?? row.operator}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {row.rate === null ? (
                    <span className="text-slate-400">미확정</span>
                  ) : (
                    row.rate.toLocaleString("ko-KR")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-slate-400">
        마지막 확인 {verifiedAt} · 자동 수집이 아니라 사람이 기록합니다.
      </p>
    </section>
  )
}
```

`web/src/components/Glossary.tsx`:

```tsx
const FORM_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체

export default function Glossary() {
  return (
    <section className="px-4 py-8 text-sm leading-relaxed text-slate-600">
      <h2 className="text-base font-medium text-slate-700">두 가지 환율</h2>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="font-medium text-slate-800">적용환율</dt>
          <dd>
            달러 표시가를 원화로 환산할 때 쓰는 환율입니다. 직전 영업일에 고시된
            매매기준율이 그대로 적용되며, 매일 바뀝니다.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-800">
            면세점 기준환율(국산품용)
          </dt>
          <dd>
            국산 브랜드의 원화 공급가를 달러 표시가로 바꿀 때 면세점이 쓰는 자체
            환율입니다. 1년에 서너 번 바뀌고, 수입 브랜드에는 적용되지 않습니다.
          </dd>
        </div>
      </dl>

      <p className="mt-4">
        오늘 뉴스에 나온 환율은 <strong>내일</strong> 적용환율입니다. 오늘 면세점에
        적용되는 값은 그 전날 고시된 것이라, 뉴스의 등락 방향과 반대인 날이 절반에
        가깝습니다.
      </p>

      <p className="mt-4 text-xs text-slate-400">
        출처: 서울외국환중개 매매기준율 · 보세판매장 운영에 관한 고시 제3조제4항
        <br />
        기준환율 변경을 발견하셨다면{" "}
        <a href={FORM_URL} className="underline" rel="noreferrer">
          제보해 주세요
        </a>
        .
      </p>
    </section>
  )
}
```

`web/src/App.tsx` 에 다음을 더한다:

```tsx
import baseRatesCsv from "../../data/base_rates.csv?raw"
import meta from "../../data/meta.json"

import BaseRateHistory from "./components/BaseRateHistory"
import Glossary from "./components/Glossary"
import { parseBaseRates } from "./lib/baseRates"

const baseRates = parseBaseRates(baseRatesCsv)
```

그리고 `<RateChart ... />` 아래에:

```tsx
      <BaseRateHistory history={baseRates} verifiedAt={meta.base_rates_verified_at} />
      <Glossary />
```

`web/tsconfig.json` 의 `compilerOptions` 에 `"resolveJsonModule": true` 를 추가한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd web && npm test && npm run type-check`
Expected: 19 passed, 타입 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add web/ data/ && git commit -m "feat(web): show base-rate history and rate glossary"
```

---

# Phase 3 — 배포와 데이터 확정

---

### Task 13: Vercel 배포

**Files:**
- Create: `vercel.json`
- Create: `README.md`

**Interfaces:**
- Consumes: `web/` 빌드 산출물
- Produces: 없음

- [ ] **Step 1: Vercel 설정 작성**

리포 루트의 `vercel.json`:

```json
{
  "buildCommand": "cd web && npm ci && npm run build",
  "outputDirectory": "web/dist",
  "installCommand": "echo skip",
  "framework": null
}
```

`installCommand` 를 건너뛰는 이유: 리포 루트에 package.json 이 없고, 실제 설치는
`buildCommand` 안에서 `web/` 기준으로 일어난다.

- [ ] **Step 2: README 작성**

리포 루트 `README.md`:

```markdown
# 면세점 환율

한국 면세점 **적용환율**을 매일 기록·공개하고, **면세점 기준환율**(국산품용) 변경
이력을 아카이브한다.

내일 적용환율은 예측이 아니다. 오늘 08:00 에 고시된 매매기준율이 법령에 따라
내일 그대로 적용된다(보세판매장 운영에 관한 고시 제3조제4항).

- 도메인·용어·법령 근거: [`docs/domain-reference.md`](docs/domain-reference.md)
- 설계: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- 운영: [`deploy/README.md`](deploy/README.md)

## 구조

| 경로 | 역할 |
|---|---|
| `collector/` | 서울외국환중개 수집기 (Python 3.12). VM 크론이 KST 09:00 에 실행 |
| `data/` | CSV 아카이브. git 이 곧 저장소이자 백업이며 감사 이력 |
| `web/` | 정적 사이트 (React + Vite). Vercel 이 data 커밋마다 재빌드 |
| `deploy/` | 크론 래퍼와 운영 문서 |

## 개발

```bash
cd collector && python3.12 -m venv .venv && .venv/bin/pip install -e . --group dev
.venv/bin/pytest

cd ../web && npm ci && npm test && npm run dev
```
```

- [ ] **Step 3: 빌드 확인**

Run: `cd web && npm ci && npm run build`
Expected: `web/dist/` 생성, 타입 오류 없음

- [ ] **Step 4: Vercel 연결**

GitHub 리포를 Vercel 에 연결한다. Root Directory 는 리포 루트로 두고 위 `vercel.json`
이 빌드를 맡는다. 배포 후 `*.vercel.app` 주소에서 오늘·내일 숫자가 보이는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add vercel.json README.md && git commit -m "feat(deploy): configure Vercel static build"
```

---

### Task 14: 제보 폼 연결

**Files:**
- Modify: `web/src/components/Glossary.tsx:1`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 폼 생성**

Tally 또는 Google Forms 로 폼을 만든다. 필수 필드 다섯 개:

| 필드 | 형식 |
|---|---|
| 면세점 | 롯데 / 신라 / 신세계 / 현대 중 선택 |
| 상품명 | 단답 |
| 예전 달러가(정가) | 숫자 |
| 지금 달러가(정가) | 숫자 |
| 확인 날짜 | 날짜 |

이 다섯이면 `기준환율_new = 기준환율_old × (예전가 ÷ 지금가)` 가 계산된다.
할인가가 아니라 **정가**를 받는 것이 중요하다 — 프로모션은 할인가만 건드리므로
정가를 추적하면 노이즈가 거의 없다.

- [ ] **Step 2: 주소 교체**

`web/src/components/Glossary.tsx` 첫 줄의 `FORM_URL` 을 실제 주소로 바꾸고 주석을
지운다.

- [ ] **Step 3: 확인**

Run: `cd web && npm run dev`
Expected: 하단 "제보해 주세요" 링크가 폼으로 연결된다.

- [ ] **Step 4: 커밋**

```bash
git add web/ && git commit -m "feat(web): link the base-rate report form"
```

---

### Task 15: 기준환율 시드 확정

**Files:**
- Modify: `data/base_rates.csv`
- Modify: `data/meta.json`
- Modify: `docs/domain-reference.md:200-215` (§4 변경 이력 표)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 원문 기사 확인**

`docs/domain-reference.md` §4 의 시드 표는 2차 보도 요약에서 뽑은 것이라 **서로
충돌한다.** 특히 2026년 7월·8월 건은 기사마다 방향과 날짜가 엇갈린다. 아래 기사
원문을 직접 읽어 면세점별 값과 적용일을 확정한다.

- 2026-03 인상: `면세업계, 기준 환율 1400→1450원으로 올려`
- 2026-07 변경: `면세점 기준환율 1500원으로 상향…국내 브랜드 가격 방어`
- 2026-08 인하: `고환율 꺾이자…면세점도 14개월 만에 기준환율 내렸다`
- 2026-09 인하: `면세점 기준환율 한달만에 또 내린다`

확정할 수 없는 건은 **`status=unconfirmed` 로 남긴다.** 비워두면 구멍이 남고,
추정치를 확정인 척 넣으면 기록이 오염된다.

- [ ] **Step 2: CSV 채우기**

`data/base_rates.csv` 에 면세점별로 한 행씩 넣는다. `operator` 는
`lotte` / `shilla` / `shinsegae` / `hyundai`. 형식 예:

```csv
operator,effective_date,rate,status,source_url,note
lotte,2026-07-08,1500,confirmed,https://www.sedaily.com/article/20064812,
shilla,2026-07-08,1500,confirmed,https://www.sedaily.com/article/20064812,
shinsegae,2026-07-09,1500,confirmed,https://www.sedaily.com/article/20064812,
hyundai,2026-07-09,1500,confirmed,https://www.sedaily.com/article/20064812,
```

- [ ] **Step 3: 확인일 갱신**

`data/meta.json` 의 `base_rates_verified_at` 을 오늘 날짜로 바꾼다.

- [ ] **Step 4: 도메인 문서 동기화**

`docs/domain-reference.md` §4 의 "확정 필요" 경고를 실제 확정 결과로 대체한다.
여전히 미확정인 건이 있으면 그것만 남긴다.

- [ ] **Step 5: 화면 확인**

Run: `cd web && npm test && npm run dev`
Expected: 기준환율 이력 표에 행이 보이고, 미확정 행은 "미확정"으로 표시된다.

- [ ] **Step 6: 커밋**

```bash
git add data/ docs/ && git commit -m "data(base-rates): seed confirmed base-rate history"
```

---

## 완료 기준

- [ ] `cd collector && .venv/bin/pytest` — 21 passed
- [ ] `cd web && npm test && npm run build` — 19 passed, 빌드 성공
- [ ] `data/rates.csv` 에 2,600행 이상, 빈 필드 없음
- [ ] 크론 1회 실행 후 `no change` 또는 커밋 1건 (멱등성)
- [ ] healthchecks.io 체크가 초록
- [ ] Vercel 주소 첫 화면에 스크롤 없이 두 숫자가 보임
- [ ] 광고·트래커 코드 0건
