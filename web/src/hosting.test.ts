import { expect, test } from "vitest"

import config from "../../vercel.json"

test.each([
  ["/zh-hans", "/zh-Hans.html"],
  ["/zh-hans/guide", "/zh-Hans-guide.html"],
  ["/zh-hant", "/zh-Hant.html"],
  ["/zh-hant/guide", "/zh-Hant-guide.html"],
])("소문자 %s는 한국어 fallback보다 먼저 중국어 HTML로 연결한다", (path, destination) => {
  const rewrite = config.rewrites.find((rule) => rule.source === path || rule.source === "/(.*)")
  expect(rewrite?.destination).toBe(destination)
})
