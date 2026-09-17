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
