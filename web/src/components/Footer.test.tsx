import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import Footer from "./Footer"

test("제보 링크가 실제 폼으로 간다", () => {
  // 자리표시자(example.com)가 한 번 프로덕션까지 나갔다. 눈으로는 안 보이는 고장이다.
  render(<Footer />)

  expect(screen.getByRole("link", { name: "제보하기" })).toHaveAttribute(
    "href",
    expect.stringMatching(/^https:\/\/forms\.gle\//),
  )
})

test("출처가 글자는 그대로 둔 채 링크가 된다", () => {
  render(<Footer />)

  expect(screen.getByRole("link", { name: "서울외국환중개 고시" })).toHaveAttribute(
    "href",
    expect.stringContaining("smbs.biz"),
  )
})

test("최근 고시일을 적는다 — 수집이 멈춰도 화면 숫자가 언제 것인지 알 수 있게", () => {
  render(<Footer latestFixingDate="2026-11-06" />)

  expect(screen.getByText(/최근 고시 11\/6\(금\)/)).toBeInTheDocument()
})

test("고시일을 모르면 그 줄을 비워 두지 않고 뺀다", () => {
  render(<Footer />)

  expect(screen.queryByText(/최근 고시/)).not.toBeInTheDocument()
})

test("번체 환산마다 기준일·출처·단위를 밝히고 수수료 제외를 안내한다", () => {
  render(<Footer lang="zh-Hant" conversions={[
    { currency: "TWD", fixingDate: "2026-11-10", krwPerUnit: 41.33, source: "smbs" },
    { currency: "HKD", fixingDate: "2026-11-09", krwPerUnit: 170.68, source: "ecb" },
  ]} />)
  expect(screen.getByText(/新台幣換算.*11\/10\(二\).*1新台幣 = 41.33韓元/)).toHaveTextContent("SMBS")
  expect(screen.getByText(/港幣換算.*11\/9\(一\).*1港幣 = 170.68韓元/)).toHaveTextContent("ECB")
  expect(screen.getAllByText(/不含發卡機構的匯率差額及手續費/)).toHaveLength(2)
})

test("공유 시트가 없는 브라우저에서 복사가 실패하면 실패를 알린다", async () => {
  // 데스크톱 대부분이 이 경로다. 실패가 말없이 끝나면 버튼이 고장 난 것처럼 보인다.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.reject(new Error("denied")) },
  })
  render(<Footer />)

  fireEvent.click(screen.getByRole("button", { name: "공유하기" }))

  expect(await screen.findByRole("button", { name: "복사 실패" })).toBeInTheDocument()
})
