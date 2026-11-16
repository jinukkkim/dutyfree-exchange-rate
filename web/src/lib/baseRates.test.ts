import { expect, test } from "vitest"

import { parseBaseRateChanges } from "./baseRates"

const HEADER = "operator,effective_date,previous_rate,rate,status,source_names,source_urls,note\n"

test("같은 달의 동일 변경은 한 사건으로 묶고 면세점별 적용일과 출처를 보존한다", () => {
  const [change] = parseBaseRateChanges(HEADER + [
    "lotte,2026-09-10,1400,1350,confirmed,서울경제,https://example.com/a,",
    "hyundai,2026-09-10,1400,1350,confirmed,서울경제,https://example.com/a,",
    "shilla,2026-09-11,1400,1350,confirmed,헤럴드경제,https://example.com/b,",
    "shinsegae,2026-09-11,1400,1350,confirmed,헤럴드경제,https://example.com/b,",
  ].join("\n"))
  expect(change.period).toBe("2026-09")
  expect(change.previousRate).toBe(1400)
  expect(change.rate).toBe(1350)
  expect(change.applications).toEqual([
    { effectiveDate: "2026-09-10", operators: ["lotte", "hyundai"], status: "confirmed" },
    { effectiveDate: "2026-09-11", operators: ["shilla", "shinsegae"], status: "confirmed" },
  ])
  expect(change.sources).toEqual([
    { name: "서울경제", url: "https://example.com/a" },
    { name: "헤럴드경제", url: "https://example.com/b" },
  ])
})

test("같은 전후 값이라도 변경 시기가 다르면 별개 사건으로 최신순 표시한다", () => {
  const changes = parseBaseRateChanges(HEADER + [
    "lotte,2024-12-20,1350,1400,confirmed,뉴시스,https://example.com/december,",
    "lotte,2025-11-04,1350,1400,confirmed,뉴시스,https://example.com/november,",
    "industry,2025-06,1400,1350,unconfirmed,서울경제,https://example.com/june,개별 면세점 미확인",
  ].join("\n"))
  expect(changes.map(({ period, previousRate, rate }) => ({ period, previousRate, rate }))).toEqual([
    { period: "2025-11", previousRate: 1350, rate: 1400 },
    { period: "2025-06", previousRate: 1400, rate: 1350 },
    { period: "2024-12", previousRate: 1350, rate: 1400 },
  ])
})

test("같은 달이어도 변경 전 값이 다르면 합치지 않는다", () => {
  const changes = parseBaseRateChanges(HEADER + [
    "lotte,2026-08-07,1500,1400,confirmed,기사,https://example.com/a,",
    "shilla,2026-08-10,1450,1400,confirmed,기사,https://example.com/a,",
  ].join("\n"))
  expect(changes).toHaveLength(2)
  expect(changes.map((change) => change.previousRate)).toEqual([1500, 1450])
})

test("같은 사건의 날짜 미상 업체는 확정 적용일과 구별하고 근거 없는 업체 인상을 추정하지 않는다", () => {
  const [change] = parseBaseRateChanges(HEADER + [
    "lotte,2025-11-04,1350,1400,confirmed,기사,https://example.com/a,",
    "shilla,2025-11-03,1350,1400,confirmed,기사,https://example.com/a,",
    "shinsegae,2025-11,1350,1400,unconfirmed,기사,https://example.com/b,현대: 인상 여부·적용일 미확인",
  ].join("\n"))
  expect(change.applications).toEqual([
    { effectiveDate: "2025-11-04", operators: ["lotte"], status: "confirmed" },
    { effectiveDate: "2025-11-03", operators: ["shilla"], status: "confirmed" },
    { effectiveDate: "2025-11", operators: ["shinsegae"], status: "unconfirmed" },
  ])
  expect(change.notes).toEqual(["현대: 인상 여부·적용일 미확인"])
})

test("출처를 중복 없이 합친 뒤 사건별 최대 세 개로 제한한다", () => {
  const [change] = parseBaseRateChanges(HEADER + [
    "lotte,2026-07-08,1450,1500,confirmed,가|나,https://example.com/a|https://example.com/b,",
    "shilla,2026-07-09,1450,1500,confirmed,나|다|라,https://example.com/b|https://example.com/c|https://example.com/d,",
  ].join("\n"))
  expect(change.sources).toEqual([
    { name: "가", url: "https://example.com/a" },
    { name: "나", url: "https://example.com/b" },
    { name: "다", url: "https://example.com/c" },
  ])
})

test("빈값·비정상 금액을 0이나 NaN으로 표시하지 않으며 이전 값도 유효해야 한다", () => {
  for (const rate of ["", "NaN", "Infinity", "-1", "0"]) {
    expect(parseBaseRateChanges(HEADER + `lotte,2026-03-24,1400,${rate},confirmed,기사,https://example.com/a,`)).toEqual([])
    expect(parseBaseRateChanges(HEADER + `lotte,2026-03-24,${rate},1450,confirmed,기사,https://example.com/a,`)[0].previousRate).toBeNull()
  }
  expect(parseBaseRateChanges(HEADER)).toEqual([])
})
