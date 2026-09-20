import { expect, test } from "vitest"

import { formatDayLabel, formatRate } from "./format"

test("환율은 소수점 2자리로 표시한다", () => {
  // 보세판매장 고시 §3④2: 소수점 이하 3자리에서 버린 후 2자리까지 표시
  expect(formatRate(1353.3)).toBe("1,353.30")
  expect(formatRate(1368)).toBe("1,368.00")
  expect(formatRate(985.5)).toBe("985.50")
})

test("날짜는 방문자 타임존과 무관하게 한국 날짜로 읽는다", () => {
  // KST 기준 문자열이므로 UTC 로 파싱해야 하루가 밀리지 않는다.
  expect(formatDayLabel("2026-09-20")).toBe("9/20(일)")
  expect(formatDayLabel("2026-10-01")).toBe("10/1(목)")
})
