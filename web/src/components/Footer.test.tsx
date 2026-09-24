import { render, screen } from "@testing-library/react"
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
