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
