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

test("차이를 금액으로 환산해 보여준다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  // (1368.3 - 1353.3) * 300 = 4,500원
  expect(screen.getByText(/4,500원/)).toBeInTheDocument()
})

test("내일 값이 예측이 아님을 명시한다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText(/예측이 아니라/)).toBeInTheDocument()
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
