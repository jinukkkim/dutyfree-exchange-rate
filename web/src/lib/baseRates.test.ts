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
