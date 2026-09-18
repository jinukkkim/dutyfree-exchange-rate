import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import type { Rate } from "../lib/rates"
import RateChart from "./RateChart"

function make(fixingDate: string, rate: number, method: Rate["method"] = "MAR"): Rate {
  return { fixingDate, rate, method, source: "smbs", collectedAt: `${fixingDate}T09:00:00+09:00` }
}

const RATES = [
  make("2026-09-14", 1346.4),
  make("2026-09-15", 1345.3),
  make("2026-09-16", 1353.3),
  make("2026-09-17", 1368.3),
]

// 마지막 고시(09-17)는 09-18 적용분이다. 미래 구간을 떼지 않으려면
// 그보다 뒤인 날을 "오늘"로 준다.
const AFTER = "2026-09-30"

test("데이터 포인트만큼 선을 그린다", () => {
  const { container } = render(<RateChart rates={RATES} today={AFTER} />)
  const path = container.querySelector("path[data-testid='rate-line']")

  expect(path).toBeTruthy()
  // M x y L x y L x y L x y → 좌표쌍 4개
  expect(path!.getAttribute("d")!.match(/[ML]/g)).toHaveLength(4)
})

test("기간 선택 버튼을 제공한다", () => {
  render(<RateChart rates={RATES} today={AFTER} />)
  for (const label of ["1주", "1개월", "6개월", "1년", "5년"]) {
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
  }
})

test("MAR 과 TWAP 경계에서 선을 끊는다", () => {
  const spanning = [make("2026-12-31", 1400), make("2027-01-02", 1390, "TWAP")]
  const { container } = render(<RateChart rates={spanning} today="2027-01-10" />)

  // 방법론이 다르면 같은 선으로 잇지 않는다 → 두 개의 path
  expect(container.querySelectorAll("path[data-testid='rate-line']")).toHaveLength(2)
})

test("기간 버튼은 행 개수가 아니라 달력으로 자른다", () => {
  // 고시는 영업일에만 있다. 30 행을 자르면 달력상 약 6 주가 되므로,
  // "1개월" 버튼이 한 달보다 훨씬 긴 구간을 보여주게 된다.
  const twoMonths = Array.from({ length: 44 }, (_, index) => {
    const day = new Date(Date.UTC(2026, 6, 1))
    day.setUTCDate(day.getUTCDate() + index * 1.4) // 영업일 간격 근사
    return make(day.toISOString().slice(0, 10), 1400 + index)
  })

  const { container } = render(<RateChart rates={twoMonths} today="2026-12-01" />)
  const points = container
    .querySelector("path[data-testid='rate-line']")!
    .getAttribute("d")!
    .match(/[ML]/g)!

  // 기본 선택은 "1개월". 44 행 전부가 아니라 마지막 30 일치만 그려야 한다.
  expect(points.length).toBeLessThan(twoMonths.length)
})

test("내일 적용분은 실선과 구분해 그린다", () => {
  // 마지막 고시 09-17 → 09-18 적용. 오늘이 09-17 이면 그 점은 아직 오지 않은 날이다.
  const { container } = render(<RateChart rates={RATES} today="2026-09-17" />)

  expect(container.querySelector("path[data-testid='rate-line-future']")).toBeTruthy()
})

test("오늘까지만 있는 데이터에는 미래 구간이 없다", () => {
  const { container } = render(<RateChart rates={RATES} today={AFTER} />)

  expect(container.querySelector("path[data-testid='rate-line-future']")).toBeNull()
})

test("주말에도 내일 구간을 그린다", () => {
  // 2026-09-19 는 토요일. 마지막 고시 09-18 은 09-19(오늘)에 적용되므로
  // 내일(일요일) 점은 이월로만 생긴다 — 그래도 차트는 내일까지 닿아야 한다.
  const { container } = render(<RateChart rates={RATES} today="2026-09-19" />)

  expect(container.querySelector("path[data-testid='rate-line-future']")).toBeTruthy()
})
