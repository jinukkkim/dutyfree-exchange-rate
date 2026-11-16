import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterAll, beforeAll, expect, test } from "vitest"

import baseRatesCsv from "../../../data/base_rates.csv?raw"
import excerpts from "../../../data/base_rate_excerpts.json"
import { parseBaseRateChanges } from "../lib/baseRates"
import BaseRateHistory from "./BaseRateHistory"

function openHistory() {
  render(<BaseRateHistory />)
  fireEvent.click(screen.getByText("변경 이력 자세히 보기"))
}

// jsdom에 없는 브라우저 기본 dialog 표시 동작만 보완한다.
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal")
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close")
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", "") } })
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open") } })
})
afterAll(() => {
  for (const [name, descriptor] of [["showModal", showModal], ["close", close]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

test("출처를 누르면 해당 변경의 원문 발췌와 발행일·원문 링크를 상자에 보여준다", () => {
  openHistory()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "2026.09 헤럴드경제 출처" }))
  const dialog = screen.getByRole("dialog", { name: "헤럴드경제 기사 발췌" })
  expect(dialog).toHaveTextContent("2026.09 변경 근거")
  expect(dialog).toHaveTextContent("2026.09.11")
  expect(dialog).toHaveTextContent("롯데·현대 면세점은 10일부터,")
  expect(within(dialog).getByRole("link", { name: "기사 원문 보기" })).toHaveAttribute("href", "https://biz.heraldcorp.com/article/10870124")
  expect(within(dialog).getByRole("link", { name: "기사 원문 보기" })).toHaveAttribute("target", "_blank")
  fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("같은 기사를 다른 사건에서 열면 그 사건에 맞는 발췌를 보여주고 Esc·바깥 클릭으로 닫는다", () => {
  openHistory()
  fireEvent.click(screen.getByRole("button", { name: "2025.06 헤럴드경제 출처" }))
  let dialog = screen.getByRole("dialog")
  expect(dialog).toHaveTextContent("업계는 지난해 6월 기준환율을 1400원에서 1350원으로 내렸다가")
  expect(dialog).not.toHaveTextContent("롯데·현대 면세점은 10일부터,")
  fireEvent(dialog, new Event("cancel", { cancelable: true }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "2026.09 서울경제 출처" }))
  dialog = screen.getByRole("dialog")
  fireEvent.click(within(dialog).getByRole("heading"))
  expect(screen.getByRole("dialog")).toBeInTheDocument()
  fireEvent.click(dialog)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("변경 이력은 기본적으로 접혀 있고 토글을 누를 때만 상세 표를 보여준다", () => {
  render(<BaseRateHistory />)
  const disclosure = screen.getByText("변경 이력 자세히 보기")
  expect(screen.getByRole("table", { hidden: true })).not.toBeVisible()
  fireEvent.click(disclosure)
  expect(screen.getByRole("table")).toBeVisible()
  fireEvent.click(disclosure)
  expect(screen.getByRole("table", { hidden: true })).not.toBeVisible()
})

test("모든 표시 출처에 사건별 발췌가 있으며 한 기사 전체 인용량은 25어절 이하다", () => {
  const records: Record<string, { publishedAt: string; excerpts: Record<string, string[]> }> = excerpts
  for (const change of parseBaseRateChanges(baseRatesCsv)) {
    for (const source of change.sources) {
      expect(records[source.url]?.excerpts[change.period]?.length, `${change.period} ${source.name}`).toBeGreaterThan(0)
    }
  }
  for (const [url, record] of Object.entries(records)) {
    const words = Object.values(record.excerpts).flat().join(" ").trim().split(/\s+/)
    expect(words.length, url).toBeLessThanOrEqual(25)
  }
})
