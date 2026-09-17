import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import { parseBaseRates } from "../lib/baseRates"
import BaseRateHistory from "./BaseRateHistory"

const CSV = `operator,effective_date,rate,status,source_url,note
lotte,2026-07-08,1500,confirmed,https://example.com/a,
shilla,2025-11,1400,unconfirmed,https://example.com/b,일자 미확인
`

test("값을 아는 미확정 행도 확정 행과 구분된다", () => {
  // 비워두면 아는 것까지 잃고, 값만 보여주면 확정인 척이 된다. 둘 다 보여야 한다.
  render(<BaseRateHistory history={parseBaseRates(CSV)} verifiedAt="2026-09-18" />)

  expect(screen.getByText("1,400")).toBeInTheDocument()
  expect(screen.getByText("미확정")).toBeInTheDocument()
})

test("확정 행에는 미확정 표식이 붙지 않는다", () => {
  const confirmedOnly = parseBaseRates(`operator,effective_date,rate,status,source_url,note
lotte,2026-07-08,1500,confirmed,https://example.com/a,
`)
  render(<BaseRateHistory history={confirmedOnly} verifiedAt="2026-09-18" />)

  expect(screen.getByText("1,500")).toBeInTheDocument()
  expect(screen.queryByText("미확정")).not.toBeInTheDocument()
})

test("미확정 사유가 마우스 없이도 읽힌다", () => {
  // title 속성만으로는 키보드·터치·스크린리더 사용자에게 닿지 않는다.
  render(<BaseRateHistory history={parseBaseRates(CSV)} verifiedAt="2026-09-18" />)

  expect(screen.getByText(/일자 미확인/)).toBeInTheDocument()
})
