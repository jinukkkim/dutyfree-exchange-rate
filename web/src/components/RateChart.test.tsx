import { fireEvent, render, screen } from "@testing-library/react"
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

/** 5년 컷오프 양쪽에 점이 걸치도록 10 년을 덮는다. */
const DECADE = [
  make("2016-01-04", 1172),
  make("2021-06-01", 1110),
  make("2024-01-02", 1300),
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
  for (const label of ["1개월", "6개월", "1년", "5년", "전체"]) {
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

test("고시가 멈춘 주말에는 내일 구간을 그리지 않는다", () => {
  // 위 테스트의 짝. 주말 예외만 보면 토·일에는 무조건 내일까지 잇는데,
  // 고시가 멈춘 뒤 맞는 토요일에는 한 주 넘게 묵은 값을 내일 적용분처럼
  // 그리게 된다. 마지막 고시 09-17 기준으로 빠진 평일이 한계를 넘는 첫
  // 토요일이 10-03 이다 — 평일에 잡으면 "오늘 고시 없음" 분기로도 끊겨서
  // 신선도 게이트가 근거인지 구별되지 않는다.
  const { container } = render(<RateChart rates={RATES} today="2026-10-03" />)

  expect(container.querySelector("path[data-testid='rate-line-future']")).toBeNull()
})

test("오늘 표시는 1개월 구간에만 둔다", () => {
  render(<RateChart rates={RATES} today="2026-09-17" />)

  expect(screen.getByText("오늘")).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "전체" }))

  expect(screen.queryByText("오늘")).not.toBeInTheDocument()
})

test("방법론 경계에 걸린 날에는 내일 구간을 잇지 않는다", () => {
  // 2027-01-01 TWAP 전환. 이 하루는 오늘(MAR 적용)과 내일(TWAP 적용)이 경계를
  // 사이에 두고 갈린다. 값의 성격이 다르므로 한 선으로 이어서는 안 된다.
  const boundary = [make("2026-12-30", 1400), make("2026-12-31", 1405), make("2027-01-01", 1390, "TWAP")]
  const { container } = render(<RateChart rates={boundary} today="2027-01-01" />)

  expect(container.querySelector("path[data-testid='rate-line-future']")).toBeNull()
})

test("그릴 점이 모자라도 구간 버튼으로 빠져나갈 수 있다", () => {
  // 점이 하나뿐이면 선을 그릴 수 없다. 이때 섹션을 통째로 지우면 다른 구간으로
  // 바꿀 버튼까지 사라져 빠져나갈 길이 없어진다.
  const sparse = [make("2025-08-01", 1400), make("2025-10-10", 1410)]
  const { container } = render(<RateChart rates={sparse} today="2025-10-20" />)

  expect(screen.getByText(/이 구간에는 고시가 없습니다/)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "전체" }))

  expect(container.querySelector("path[data-testid='rate-line']")).toBeTruthy()
})

test("전체 구간은 가장 오래된 고시까지 그린다", () => {
  // 무한대를 날짜에서 빼면 Invalid Date 가 되고 toISOString() 이 throw 한다.
  // 자르지 않고 그대로 넘기는 경로가 반드시 있어야 한다.
  const { container } = render(<RateChart rates={DECADE} today="2026-09-30" />)

  fireEvent.click(screen.getByRole("button", { name: "전체" }))

  // 5년 컷오프(2021-09-18) 이전 고시까지 살아 있어야 한다 → 좌표쌍 4개
  const points = container
    .querySelector("path[data-testid='rate-line']")!
    .getAttribute("d")!
    .match(/[ML]/g)!
  expect(points).toHaveLength(4)
})

test("5년 구간은 그보다 오래된 고시를 자른다", () => {
  const { container } = render(<RateChart rates={DECADE} today="2026-09-30" />)

  fireEvent.click(screen.getByRole("button", { name: "5년" }))

  // 2016·2021-06 은 컷오프 밖이다 → 2024·2026 두 개만 남는다
  expect(
    container
      .querySelector("path[data-testid='rate-line']")!
      .getAttribute("d")!
      .match(/[ML]/g)!,
  ).toHaveLength(2)
})
