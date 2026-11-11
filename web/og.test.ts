import { ogDescription, searchDescription } from "./og"
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

const search = (...rows: string[]) => searchDescription(parseRates(csv(...rows)))

test.each([
  { lang: "zh-Hans", name: "韩国免税店汇率", unit: "韩元", published: "公布", down: "下降", flat: "持平" },
  { lang: "zh-Hant", name: "韓國免稅店匯率", unit: "韓元", published: "公布", down: "下降", flat: "持平" },
] as const)("$lang 검색 설명에 적용일·원화 환율·등락을 적는다", ({ lang, name, unit, published, down, flat }) => {
  const description = (...rows: string[]) => searchDescription(parseRates(csv(...rows)), lang)
  expect(description("2026-11-09,1357.9", "2026-11-10,1355.7")).toBe(
    `${name}。11/11(三) 1美元 = 1,355.70${unit}，比11/10(二)的1,357.90${unit}${down}2.20${unit}。11/10${published}。`,
  )
  expect(description("2026-11-05,1340.7", "2026-11-06,1342")).toContain("11/7(六)至11/9(一)")
  expect(description("2026-11-09,1357.9", "2026-11-10,1357.9")).toContain(flat)
})

test("영어 검색 설명도 날짜·환율·등락을 말한다", () => {
  const en = (...rows: string[]) => searchDescription(parseRates(csv(...rows)), "en")
  expect(en("2026-11-09,1357.9", "2026-11-10,1355.7")).toBe(
    "Korea duty free exchange rate. Nov 11 (Wed) 1 USD = 1,355.70 KRW, down 2.20 from 1,357.90 on Nov 10 (Tue). Published Nov 10.",
  )
  expect(en("2026-11-05,1340.7", "2026-11-06,1342")).toBe(
    "Korea duty free exchange rate. Nov 7 (Sat) - Nov 9 (Mon) 1 USD = 1,342.00 KRW, up 1.30 from 1,340.70 on Nov 6 (Fri). Published Nov 6.",
  )
  expect(en("2026-11-09,1357.9", "2026-11-10,1357.9")).toContain("unchanged from 1,357.90 on Nov 10 (Tue)")
})

test("일본어 검색 설명도 날짜·환율·등락을 말한다", () => {
  const ja = (...rows: string[]) => searchDescription(parseRates(csv(...rows)), "ja")
  expect(ja("2026-11-09,1357.9", "2026-11-10,1355.7")).toBe(
    "韓国免税店の為替レート。11/11(水) 1ドル = 1,355.70ウォン、11/10(火)の1,357.90ウォンから2.20ウォン下落。11/10公表。",
  )
  expect(ja("2026-11-05,1340.7", "2026-11-06,1342")).toContain("11/7(土)〜11/9(月) 1ドル = 1,342.00ウォン")
  expect(ja("2026-11-09,1357.9", "2026-11-10,1357.9")).toContain("11/10(火)の1,357.90ウォンから変動なし")
})

test("검색 설명은 다음 적용 환율과 등락을 날짜와 함께 말한다", () => {
  expect(search("2026-11-09,1357.9", "2026-11-10,1355.7")).toBe(
    "오늘·내일 면세점 환율. 11/11(수) 1달러 1,355.70원, 11/10(화) 1,357.90원보다 2.20원 내림. 11/10 고시로 확정.",
  )
})

test("금요일 고시는 다음 고시일까지의 적용 기간과 오름을 쓴다", () => {
  expect(search("2026-11-05,1340.7", "2026-11-06,1342")).toBe(
    "오늘·내일 면세점 환율. 11/7(토)~11/9(월) 1달러 1,342.00원, 11/6(금) 1,340.70원보다 1.30원 오름. 11/6 고시로 확정.",
  )
})

test("값이 같으면 변동 없음이라고 쓴다", () => {
  expect(search("2026-11-09,1357.9", "2026-11-10,1357.9")).toBe(
    "오늘·내일 면세점 환율. 11/11(수) 1달러 1,357.90원, 11/10(화) 1,357.90원에서 변동 없음. 11/10 고시로 확정.",
  )
})

test("비교할 이전 고시가 없으면 비교 없이 쓴다", () => {
  expect(search("2026-11-10,1355.7")).toBe(
    "오늘·내일 면세점 환율. 11/11(수) 1달러 1,355.70원. 11/10 고시로 확정.",
  )
})

test("휴장일 목록을 벗어나 다음 고시일을 모르면 기간 없이 적용 시작일만 쓴다", () => {
  expect(search("2099-01-02,1300")).toContain("1/3(토) 1달러 1,300.00원")
})
