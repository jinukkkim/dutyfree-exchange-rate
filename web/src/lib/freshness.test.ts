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
