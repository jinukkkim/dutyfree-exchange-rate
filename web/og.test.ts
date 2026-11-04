import { ogDescription } from "./og"
import { parseRates } from "./src/lib/rates"

const csv = (...rows: string[]) =>
  ["fix_date,rate,method,source,collected_at", ...rows.map((r) => `${r},MAR,smbs,x`)].join("\n")

test("지금 적용 중인 환율과 확정 사실만 말하고, 다음 적용 환율 숫자는 숨긴다", () => {
  const rates = parseRates(csv("2026-11-03,1341", "2026-11-04,1341.2"))
  const text = ogDescription(rates)
  expect(text).toBe(
    "11/4(수) 면세점 환율은 1,341.00원입니다. " +
      "11/5(목)부터 적용될 환율은 11/4(수) 08시 고시로 확정됐습니다. 지금 확인하세요.",
  )
  expect(text).not.toContain("1,341.20")
})

test("금요일 고시는 토요일부터 적용된다고 쓴다", () => {
  const rates = parseRates(csv("2026-11-05,1350", "2026-11-06,1360"))
  expect(ogDescription(rates)).toContain("11/7(토)부터 적용될 환율은 11/6(금) 08시 고시로")
})
