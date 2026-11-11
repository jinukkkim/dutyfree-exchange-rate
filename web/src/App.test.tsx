import { fireEvent, render, screen } from "@testing-library/react"
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
