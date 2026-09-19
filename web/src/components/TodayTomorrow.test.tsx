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

test("어느 쪽이 얼마나 비싼지 문장으로 말한다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText(/내일은 오늘보다 15원 비쌉니다/)).toBeInTheDocument()
})

test("오늘과 내일에 각자의 적용일을 붙인다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("9/17(목)")).toBeInTheDocument()
  expect(screen.getByText("9/18(금)")).toBeInTheDocument()
})

test("달을 넘어가도 내일 날짜가 맞는다", () => {
  const monthEnd = parseRates(`fix_date,rate,method,source,collected_at
2026-09-29,1350,MAR,smbs,2026-09-30T09:00:00+09:00
2026-09-30,1360,MAR,smbs,2026-10-01T09:00:00+09:00
`)
  render(<TodayTomorrow rates={monthEnd} today="2026-09-30" />)

  expect(screen.getByText("10/1(목)")).toBeInTheDocument()
})

test("환율 정보 페이지로 가는 링크를 둔다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByRole("link", { name: /어떻게 정해지나요/ })).toHaveAttribute(
    "href",
    "#/guide",
  )
})

test("내일 고시가 아직 없으면 오늘만 보여준다", () => {
  const partial = parseRates(`fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
`)
  render(<TodayTomorrow rates={partial} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText(/아직 고시되지 않았습니다/)).toBeInTheDocument()
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

test("내일이 오늘과 같으면 같다고 말한다", () => {
  // 2026-09-19 는 토요일. 09-18 고시가 토·일 이틀을 덮으므로 두 값이 같다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.getByText(/내일도 오늘과 같습니다/)).toBeInTheDocument()
  expect(screen.getByText(/직전 고시가 그대로 이어집니다/)).toBeInTheDocument()
})
