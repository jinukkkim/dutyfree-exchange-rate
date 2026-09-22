import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import { parseRates } from "../lib/rates"
import TodayTomorrow from "./TodayTomorrow"

const CSV = `fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`

test("오늘과 내일 적용환율을 2자리로 보여준다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText("1,368.30")).toBeInTheDocument()
})

test("오늘과 내일에 각자의 적용일을 붙인다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("오늘 · 9/17(목)")).toBeInTheDocument()
  expect(screen.getByText("내일 · 9/18(금)")).toBeInTheDocument()
})

test("달을 넘어가도 내일 날짜가 맞는다", () => {
  const monthEnd = parseRates(`fix_date,rate,method,source,collected_at
2026-09-29,1350,MAR,smbs,2026-09-30T09:00:00+09:00
2026-09-30,1360,MAR,smbs,2026-10-01T09:00:00+09:00
`)
  render(<TodayTomorrow rates={monthEnd} today="2026-09-30" />)

  expect(screen.getByText("내일 · 10/1(목)")).toBeInTheDocument()
})

test("환율 정보 페이지로 가는 링크를 둔다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(
    screen.getByRole("link", { name: /환율이 정해지는 방식/ }),
  ).toHaveAttribute("href", "/guide")
})

test("오르면 차액을 빨강으로, 같으면 회색으로 적는다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("▲ 15.00")).toHaveClass("text-up")
})

test("두 값이 같으면 차액을 회색으로 적는다", () => {
  // 2026-09-19 는 토요일. 09-18 고시가 토·일 이틀을 덮으므로 두 값이 같다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.getByText("0.00")).toHaveClass("text-muted")
})

test("내일 고시가 아직 없으면 오늘만 보여준다", () => {
  const partial = parseRates(`fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
`)
  render(<TodayTomorrow rates={partial} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText(/아직 고시되지 않았습니다/)).toBeInTheDocument()
})

test("고시가 멈춘 상태에서는 '아직'이라고 말하지 않는다", () => {
  // 09-17 이 마지막 고시인 채로 맞은 10-03(토). 빠진 평일이 7일을 넘어
  // 낡음이고, 이 상태에서 "아직"은 곧 나온다는 거짓말이 된다.
  const frozen = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`)
  render(<TodayTomorrow rates={frozen} today="2026-10-03" />)

  expect(
    screen.getByText("9/17(목) 이후 고시가 확인되지 않습니다"),
  ).toBeInTheDocument()
  expect(screen.queryByText(/아직 고시되지 않았습니다/)).not.toBeInTheDocument()
})

test("고시일을 잃어도 '아직'으로 돌아가지 않는다", () => {
  // CSV 가 깨져 고시일 셀이 빈 경우. 날짜는 못 붙이지만 낡음은 낡음이다.
  // 여기서 "아직"이 나가면, 데이터가 가장 망가진 순간에 가장 태연한 안내를
  // 하게 된다. parseRates 는 셀을 검증하지 않으므로 닿을 수 있는 경로다.
  const broken = parseRates(`fix_date,rate,method,source,collected_at
,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={broken} today="2026-10-03" />)

  expect(screen.getByText("고시가 확인되지 않습니다")).toBeInTheDocument()
  expect(screen.queryByText(/아직 고시되지 않았습니다/)).not.toBeInTheDocument()
})

test("주말에는 오늘 고시가 없어도 내일을 확정으로 보여준다", () => {
  // 2026-09-19 는 토요일. 고시는 09-18(금)이 마지막이고 토요일 고시는 영영 없다.
  // 일요일 적용환율은 그 금요일 고시로 확정이므로 "미고시"가 뜨면 안 된다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.queryByText(/아직 고시되지 않았습니다/)).not.toBeInTheDocument()
  expect(screen.getAllByText("1,380.30")).toHaveLength(2)
})

test("두 값이 같아도 차액 칸은 자리를 지킨다", () => {
  // 칸이 통째로 사라지면 58px 숫자 둘이 맞붙어 한 덩어리로 읽힌다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.getByText("0.00")).toBeInTheDocument()
})
