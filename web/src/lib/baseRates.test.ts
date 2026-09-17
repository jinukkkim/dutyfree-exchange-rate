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

test("note 에 쉼표가 있어도 컬럼이 밀리지 않는다", () => {
  // 사람이 쓰는 자유 텍스트 컬럼이다. 그냥 split 하면 쉼표 하나에
  // note 가 잘리고 뒤 컬럼이 조용히 어긋난다.
  const rows = parseBaseRates(`operator,effective_date,rate,status,source_url,note
lotte,2026-07-08,1500,confirmed,https://example.com/a,보도 기준, 적용일 재확인 필요
`)
  expect(rows[0].sourceUrl).toBe("https://example.com/a")
  expect(rows[0].note).toBe("보도 기준, 적용일 재확인 필요")
})
