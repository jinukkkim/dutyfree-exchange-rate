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

test("출처 두 곳이 글자는 그대로 둔 채 링크가 된다", () => {
  render(<Footer />)

  expect(screen.getByRole("link", { name: "서울외국환중개 고시" })).toHaveAttribute(
    "href",
    expect.stringContaining("smbs.biz"),
  )
  // 기준환율 링크는 base_rates.csv 의 최신 확정 행 출처다. 빈 문자열이면 깨진 링크가 된다.
  expect(screen.getByRole("link", { name: "각 면세점 공개값" })).toHaveAttribute(
    "href",
    expect.stringMatching(/^https:\/\//),
  )
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
