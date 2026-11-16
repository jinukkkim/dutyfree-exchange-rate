import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import BaseRateChart from "./BaseRateChart"

afterEach(() => vi.unstubAllGlobals())

test("확인한 변경을 과거부터 표시하고 가로축은 월까지만 표시한다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  expect(within(screen.getByTestId("base-rate-time-axis")).getAllByText(/^\d{4}\.\d{2}\.$/).map((label) => label.textContent)).toEqual([
    "2024.12.", "2025.12.", "2026.11.",
  ])
  expect(chart).toHaveAccessibleDescription(/2024.12. 1,400원\/달러.*2025.06. 1,350원\/달러.*2026.07. 1,500원\/달러.*2026.09. 1,350원\/달러/)
  expect(chart.querySelector("circle")).not.toBeInTheDocument()
  expect(screen.queryByText(/^2026\.09\.1[01]/)).not.toBeInTheDocument()
  expect(screen.queryByRole("table")).not.toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})

test("상단 금액은 고정하고 마우스 위치의 월·금액은 별도 라벨로 표시한다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  const fixed = screen.getByRole("group", { name: "최근 기준환율" })
  expect(fixed).toHaveTextContent("1,350")
  fireEvent.mouseMove(chart, { clientX: 282.6 })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("1,500")
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.07.")
  expect(fixed).toHaveTextContent("1,350")
  expect(fixed).toHaveTextContent("2026.11.")
  expect(fixed).not.toHaveTextContent("1,500")
  fireEvent.mouseMove(chart, { clientX: 332 })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("1,350")
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.11.")
  fireEvent.mouseLeave(chart)
  expect(chart.querySelector("circle")).not.toBeInTheDocument()
  expect(screen.queryByTestId("base-rate-hover-label")).not.toBeInTheDocument()
  expect(fixed).toHaveTextContent("2026.11.")
  expect(fixed).toHaveTextContent("1,350")
})

test("시안처럼 기본 금액을 표시하고 좁은 화면에서도 실제 너비로 그려 월별 선택을 유지한다", () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(private callback: () => void) {}
    observe(target: Element) {
      Object.defineProperty(target, "getBoundingClientRect", { value: () => ({ width: 320 }) })
      this.callback()
    }
    disconnect() {}
  })
  render(<BaseRateChart />)
  const readout = screen.getByRole("group", { name: "최근 기준환율" })
  expect(readout).toHaveTextContent("2026.11.")
  expect(readout).toHaveTextContent("1,350")
  expect(readout).toHaveTextContent("원/달러")
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  expect(chart).toHaveAttribute("viewBox", "0 0 320 240")
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  fireEvent.mouseMove(chart, { clientX: 280.9 })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.07.")
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("1,500")
  expect(readout).toHaveTextContent("1,350")
  fireEvent.mouseMove(chart, { clientX: 324 })
  expect(readout).toHaveTextContent("2026.11.")
  expect(readout).toHaveTextContent("1,350")
})

test("터치로도 해당 월의 값을 확인하고 손을 떼면 선택 점을 감춘다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  fireEvent.touchStart(chart, { touches: [{ clientX: 282.6 }] })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.07.")
  fireEvent.touchMove(chart, { touches: [{ clientX: 332 }] })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.11.")
  fireEvent.touchEnd(chart)
  expect(screen.queryByTestId("base-rate-hover-label")).not.toBeInTheDocument()
  expect(screen.getByRole("group", { name: "최근 기준환율" })).toHaveTextContent("1,350")
})

test("점 간 거리는 실제 개월 수에 비례하고 밀집한 7·8·9월도 각각 선택할 수 있다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  const points = [
    { clientX: 48, period: "2024.12." },
    { clientX: 122.1, period: "2025.06." },
    { clientX: 183.8, period: "2025.11." },
    { clientX: 233.2, period: "2026.03." },
    { clientX: 282.6, period: "2026.07." },
    { clientX: 295, period: "2026.08." },
    { clientX: 307.3, period: "2026.09." },
  ]
  const positions = points.map(({ clientX, period }) => {
    fireEvent.mouseMove(chart, { clientX })
    expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent(period)
    return Number(chart.querySelector("circle")!.getAttribute("cx"))
  })
  const oneMonth = positions[6] - positions[5]
  expect(oneMonth).toBeGreaterThan(0)
  const monthGaps = [6, 5, 4, 4, 1, 1]
  monthGaps.forEach((months, index) => {
    expect((positions[index + 1] - positions[index]) / oneMonth).toBeCloseTo(months, 6)
  })
})

test("변경이 없는 달을 포함해 모든 달을 선택하고 그달까지의 마지막 변경 값을 보여준다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  const months = [
    ["2024.12.", "1,400"], ["2025.01.", "1,400"], ["2025.02.", "1,400"],
    ["2025.03.", "1,400"], ["2025.04.", "1,400"], ["2025.05.", "1,400"],
    ["2025.06.", "1,350"], ["2025.07.", "1,350"], ["2025.08.", "1,350"],
    ["2025.09.", "1,350"], ["2025.10.", "1,350"], ["2025.11.", "1,400"],
    ["2025.12.", "1,400"], ["2026.01.", "1,400"], ["2026.02.", "1,400"],
    ["2026.03.", "1,450"], ["2026.04.", "1,450"], ["2026.05.", "1,450"],
    ["2026.06.", "1,450"], ["2026.07.", "1,500"], ["2026.08.", "1,400"],
    ["2026.09.", "1,350"], ["2026.10.", "1,350"], ["2026.11.", "1,350"],
  ]
  months.forEach(([period, rate], index) => {
    fireEvent.mouseMove(chart, { clientX: 48 + index * (284 / 23) })
    const label = screen.getByTestId("base-rate-hover-label")
    expect(label).toHaveTextContent(period)
    expect(label).toHaveTextContent(rate)
    expect(screen.getByRole("group", { name: "최근 기준환율" })).toHaveTextContent("1,350")
    expect(screen.getByRole("group", { name: "최근 기준환율" })).toHaveTextContent("2026.11.")
  })
})


test("마지막 변경 이후 조사한 11월까지 선을 같은 금액으로 이어 그린다", () => {
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  const line = chart.querySelector('path[fill="none"]')!
  expect(line.getAttribute("d")).toMatch(/H 624$/)
  Object.defineProperty(chart, "getBoundingClientRect", { value: () => ({ left: 20, width: 320 }) })
  fireEvent.mouseMove(chart, { clientX: 307.3 })
  expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("2026.09.")
  const septemberY = chart.querySelector("circle")!.getAttribute("cy")
  for (const [clientX, period] of [[319.65, "2026.10."], [332, "2026.11."]] as const) {
    fireEvent.mouseMove(chart, { clientX })
    expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent(period)
    expect(screen.getByTestId("base-rate-hover-label")).toHaveTextContent("1,350")
    expect(chart.querySelector("circle")).toHaveAttribute("cy", septemberY)
  }
})
