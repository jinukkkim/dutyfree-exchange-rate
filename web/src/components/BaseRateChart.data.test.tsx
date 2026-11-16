import { render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

const HEADER = "operator,effective_date,previous_rate,rate,status,source_names,source_urls,note\n"

afterEach(() => {
  vi.doUnmock("../../../data/base_rates.csv?raw")
  vi.resetModules()
})

test.each(["", "industry,2026-09,1400,NaN,unconfirmed,기사,https://example.com/a,"])(
  "유효한 기록이 없으면 차트 대신 안내를 표시한다 (%s)", async (row) => {
    vi.doMock("../../../data/base_rates.csv?raw", () => ({ default: HEADER + row }))
    const { default: BaseRateChart } = await import("./BaseRateChart")
    render(<BaseRateChart />)
    expect(screen.getByText("확인된 기준환율 이력이 없습니다.")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  },
)

test("최댓값이 50원 간격 밖에 있어도 마지막 눈금과 금액을 표시한다", async () => {
  vi.doMock("../../../data/base_rates.csv?raw", () => ({ default: HEADER + [
    "industry,2026-08,1400,1350,unconfirmed,기사,https://example.com/a,",
    "industry,2026-09,1350,1525,unconfirmed,기사,https://example.com/b,",
  ].join("\n") }))
  const { default: BaseRateChart } = await import("./BaseRateChart")
  render(<BaseRateChart />)
  const chart = screen.getByRole("img", { name: "면세점 기준환율(국산품용) 변경 추이" })
  expect(Array.from(chart.querySelectorAll("text")).map((tick) => tick.textContent)).toEqual([
    "1,350", "1,400", "1,450", "1,500", "1,525",
  ])
  expect(within(screen.getByRole("group", { name: "최근 기준환율" })).getByText("1,525")).toBeInTheDocument()
})
