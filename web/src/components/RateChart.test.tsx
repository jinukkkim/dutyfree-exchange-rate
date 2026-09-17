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
