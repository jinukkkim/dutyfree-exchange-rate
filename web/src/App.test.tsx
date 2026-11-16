import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import App from "./App"

afterEach(() => {
  window.history.replaceState({}, "", "/")
  document.documentElement.lang = "ko"
  vi.useRealTimers()
})

const chinese = [
  { lang: "zh-Hans", title: "韩国免税店汇率", guide: "了解汇率如何确定 ›", heading: "韩国免税店使用哪种汇率？", payment: "刷卡时留意结算币种", share: "分享" },
  { lang: "zh-Hant", title: "韓國免稅店匯率", guide: "了解匯率如何決定 ›", heading: "韓國免稅店使用哪種匯率？", payment: "刷卡時留意結帳幣別", share: "分享" },
] as const

test.each(chinese)("$lang 홈에서 중국어 날짜를 표시하고 같은 언어의 가이드로 보낸다", ({ lang, title, guide, share }) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-10T03:00:00Z"))
  window.history.replaceState({}, "", `/${lang}`)
  render(<App />)

  expect(document.documentElement.lang).toBe(lang)
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: guide })).toHaveAttribute("href", `/${lang}/guide`)
  expect(screen.getByText("今天 · 11/10(二)")).toBeInTheDocument()
  expect(screen.getByText("明天 · 11/11(三)")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: share })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "1年" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja")
  if (lang === "zh-Hans") {
    expect(screen.getAllByText(/^约人民币[\d.]+元$/)).toHaveLength(2)
    expect(screen.queryByText(/^約NT\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^約HK\$/)).not.toBeInTheDocument()
  } else {
    expect(screen.getAllByText(/^約NT\$[\d.]+ · HK\$[\d.]+$/)).toHaveLength(2)
    expect(screen.queryByText(/^约人民币/)).not.toBeInTheDocument()
  }
})

test.each(chinese)("$lang 가이드의 끝 슬래시를 허용하고 언어를 바꿔도 가이드를 유지한다", ({ lang, guide, heading, payment }) => {
  window.history.replaceState({}, "", `/${lang}/guide/`)
  render(<App />)

  expect(document.documentElement.lang).toBe(lang)
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: payment })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /←/ })).toHaveAttribute("href", `/${lang}`)
  expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja/guide")
  expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/guide")
  expect(screen.getByRole("link", { name: lang === "zh-Hans" ? "繁體中文" : "简体中文" }))
    .toHaveAttribute("href", `/${lang === "zh-Hans" ? "zh-Hant" : "zh-Hans"}/guide`)
  expect(screen.queryByRole("link", { name: guide })).not.toBeInTheDocument()
  expect(screen.queryByText(/^(人民币|新台幣|港幣)换算参考|^(新台幣|港幣)換算參考/)).not.toBeInTheDocument()
})

test("중국어 코드 뒤에 경로 경계가 없으면 한국어로 처리한다", () => {
  window.history.replaceState({}, "", "/zh-Hans-extra")
  render(<App />)
  expect(document.documentElement.lang).toBe("ko")
})

test.each([
  { path: "/zh-hans", lang: "zh-Hans", heading: "韩国免税店汇率", back: "/zh-Hans/guide" },
  { path: "/zh-hant", lang: "zh-Hant", heading: "韓國免稅店匯率", back: "/zh-Hant/guide" },
  { path: "/zh-hans/guide/", lang: "zh-Hans", heading: "韩国免税店使用哪种汇率？", back: "/zh-Hans" },
  { path: "/zh-hant/guide/", lang: "zh-Hant", heading: "韓國免稅店使用哪種匯率？", back: "/zh-Hant" },
])("소문자 $path도 같은 중국어 페이지와 정식 경로 링크를 사용한다", ({ path, lang, heading, back }) => {
  window.history.replaceState({}, "", path)
  render(<App />)
  expect(document.documentElement.lang).toBe(lang)
  expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /了解|←/ })).toHaveAttribute("href", back)
})

test.each(chinese)("$lang 공유 복사 실패도 번역한다", async ({ lang }) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.reject(new Error("denied")) },
  })
  window.history.replaceState({}, "", `/${lang}/guide`)
  render(<App />)
  fireEvent.click(screen.getByRole("button", { name: "分享" }))
  expect(await screen.findByRole("button", { name: lang === "zh-Hans" ? "复制失败" : "複製失敗" })).toBeInTheDocument()
})

test("한국어 가이드는 기준환율 설명 아래 차트와 바로 뒤의 접힌 상세 이력을 보여준다", () => {
  window.history.replaceState({}, "", "/guide/")
  render(<App />)

  expect(screen.getByRole("table", { hidden: true })).not.toBeVisible()
  fireEvent.click(screen.getByText("변경 이력 자세히 보기"))
  const table = screen.getByRole("table", { name: "면세점 기준환율(국산품용) 변경 이력" })
  const rows = within(table).getAllByRole("row")
  expect(rows).toHaveLength(8)
  expect(within(rows[0]).getAllByRole("columnheader")[0]).toHaveTextContent("변경")
  expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("1,400 → 1,350")
  expect(rows[1]).toHaveTextContent("2026.09")
  expect(rows[1]).toHaveTextContent("롯데·현대")
  expect(rows[1]).toHaveTextContent("신라·신세계")
  expect(rows[1]).toHaveTextContent("9/10")
  expect(rows[1]).toHaveTextContent("9/11")
  const sources = within(rows[1]).getAllByRole("button", { name: /출처/ })
  expect(sources.map((source) => source.textContent)).toEqual(["서울경제", "헤럴드경제", "아주경제"])
  expect(rows.at(-1)).toHaveTextContent("2024.12")
  expect(rows.at(-1)).toHaveTextContent("12/18")
  expect(rows.at(-1)).toHaveTextContent("12/20")
  expect(rows.at(-1)).toHaveTextContent("1,350 → 1,400")
  const november = rows.find((row) => row.textContent?.includes("2025.11"))!
  expect(november).toHaveTextContent("신세계")
  expect(november).toHaveTextContent("일자 미상")
  expect(november).toHaveTextContent("현대: 인상 여부·적용일 미확인")
  expect(november).toHaveTextContent("11/3")
  expect(november).toHaveTextContent("11/4")
  const august = rows.find((row) => row.textContent?.includes("2026.08"))!
  expect(within(august).getAllByRole("button", { name: /출처/ }).map((button) => button.textContent)).toEqual(["서울경제"])
  for (const period of ["2026.07", "2026.03"]) {
    const row = rows.find((item) => item.textContent?.includes(period))!
    expect(within(row).getAllByRole("button", { name: /출처/ })).toHaveLength(3)
  }
  expect(rows.find((row) => row.textContent?.includes("2025.06"))).toHaveTextContent("개별 면세점 미확인")
  expect(screen.getByText(/마지막 확인 2026.11.16/)).toHaveTextContent("수동")
  expect(screen.getByText(/현재 적용값을 보장하지 않습니다/)).toBeInTheDocument()
  const explanation = screen.getByRole("heading", { name: "면세점 기준환율은 다른 이야기입니다" })
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  const nextSection = screen.getByRole("heading", { name: "2027년부터 산출 방식이 바뀝니다" })
  expect(explanation.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(chart.compareDocumentPosition(nextSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(table.closest("details")).toBe(chart.closest("figure")!.nextElementSibling)
  expect(table.compareDocumentPosition(nextSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test.each(["/", "/en/guide", "/ja/guide", "/zh-Hans/guide", "/zh-Hant/guide"])("%s에는 한국어 기준환율 이력을 추가하지 않는다", (path) => {
  window.history.replaceState({}, "", path)
  render(<App />)
  expect(screen.queryByRole("table", { name: "면세점 기준환율(국산품용) 변경 이력" })).not.toBeInTheDocument()
  expect(screen.queryByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })).not.toBeInTheDocument()
})
