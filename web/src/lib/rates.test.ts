import { expect, test } from "vitest"

import { appliedOn, isTomorrowConfirmed, nextDay, parseRates } from "./rates"

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

test("nextDay 는 월·연 경계를 넘는다", () => {
  expect(nextDay("2026-09-18")).toBe("2026-09-19")
  expect(nextDay("2026-09-30")).toBe("2026-10-01")
  expect(nextDay("2026-12-31")).toBe("2027-01-01")
  // 윤년 2월. UTC 로 고정해 계산하므로 방문자 타임존과 무관해야 한다.
  expect(nextDay("2028-02-28")).toBe("2028-02-29")
})

test("평일에 오늘 고시가 없으면 내일을 확정할 수 없다", () => {
  // 2026-09-18 은 금요일. 내일 적용분은 오늘 고시인데 CSV 는 09-17 까지뿐이다.
  expect(isTomorrowConfirmed(parseRates(CSV), "2026-09-18")).toBe(false)
})

test("평일에 오늘 고시가 있으면 내일이 확정된다", () => {
  expect(isTomorrowConfirmed(parseRates(CSV), "2026-09-17")).toBe(true)
})

test("고시가 멈춘 채 맞은 주말은 확정이 아니다", () => {
  // 주말 예외가 신선도를 안 보면, 원본이 멈춘 뒤 맞는 토·일마다 낡은 값이
  // "내일 확정"으로 나간다. 09-17 고시 기준으로 빠진 평일이 7일을 넘기는
  // 첫 주말이 10-03(토) 이다 — 그 전 토요일 09-26 은 6일이라 아직 신선하고,
  // 평일에 잡으면 "오늘 고시가 아직 없다"는 기존 분기로도 false 가 나와
  // 이 가드가 근거인지 구별되지 않는다.
  expect(isTomorrowConfirmed(parseRates(CSV), "2026-10-03")).toBe(false)
})

test("주말은 고시가 없어도 확정이다", () => {
  // 토·일에는 애초에 고시가 없다. 직전 고시가 이어지는 것이 확정이므로
  // 여기서 미확정을 돌려주면 주말마다 "아직 고시되지 않았습니다"가 뜬다.
  for (const weekend of ["2026-09-12", "2026-09-13"]) {
    expect(isTomorrowConfirmed(parseRates(CSV), weekend)).toBe(true)
  }
})
