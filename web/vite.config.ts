import { readFileSync } from "node:fs"

import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

import { formatDayLabel, formatRate } from "./src/lib/format"
import { nextDay, parseRates } from "./src/lib/rates"

/**
 * 최신 고시를 index.html 에 문장으로 박는다. 네이버 크롤러는 JS 를 거의
 * 돌리지 않아서, 이게 없으면 검색 결과와 링크 미리보기에 숫자가 안 나온다.
 * Vercel 이 data 커밋마다 재빌드하므로 문장은 최신 고시와 함께 갱신된다.
 *
 * "오늘·내일"이 아니라 고시일·적용일로 쓴다. 빌드 시각과 방문 시각이 달라도
 * 참인 문장이어야 해서다.
 */
function latestFixing(): Plugin {
  return {
    name: "latest-fixing",
    transformIndexHtml(html) {
      const csv = readFileSync(new URL("../data/rates.csv", import.meta.url), "utf8")
      const latest = parseRates(csv).at(-1)
      const notice = latest
        ? `${formatDayLabel(latest.fixingDate)} 08시 고시 · ` +
          `${formatDayLabel(nextDay(latest.fixingDate))}부터 적용 면세점 환율 ${formatRate(latest.rate)}원`
        : "면세점 적용환율"
      return html.replaceAll("%LATEST_FIXING%", notice)
    },
  }
}

export default defineConfig({
  plugins: [react(), latestFixing()],
  // data/ 는 리포 루트에 있고 web/ 바깥이다. ?raw 임포트를 허용하려면 필요하다.
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
})
