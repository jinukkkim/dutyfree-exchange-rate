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

test("데이터 포인트만큼 선을 그린다", () => {
  const { container } = render(<RateChart rates={RATES} />)
  const path = container.querySelector("path[data-testid='rate-line']")

  expect(path).toBeTruthy()
  // M x y L x y L x y L x y → 좌표쌍 4개
  expect(path!.getAttribute("d")!.match(/[ML]/g)).toHaveLength(4)
})

test("기간 선택 버튼을 제공한다", () => {
  render(<RateChart rates={RATES} />)
  expect(screen.getByRole("button", { name: "1개월" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "전체" })).toBeInTheDocument()
})

test("MAR 과 TWAP 경계에서 선을 끊는다", () => {
  const spanning = [make("2026-12-31", 1400), make("2027-01-02", 1390, "TWAP")]
  const { container } = render(<RateChart rates={spanning} />)

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

  const { container } = render(<RateChart rates={twoMonths} />)
  const points = container
    .querySelector("path[data-testid='rate-line']")!
    .getAttribute("d")!
    .match(/[ML]/g)!

  // 기본 선택은 "1개월". 44 행 전부가 아니라 마지막 30 일치만 그려야 한다.
  expect(points.length).toBeLessThan(twoMonths.length)
})
