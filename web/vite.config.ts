import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

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

/**
 * /guide 전용 HTML. 앱은 한 장짜리라 /guide 도 index.html 을 받는데, 그러면
 * 검색 결과에서 홈과 제목·설명이 같아 구분이 안 된다 (네이버 CTR 0.3%).
 * 크롤러는 JS 로 바꾼 제목을 읽지 않으니 빌드 결과를 복사해 둘만 바꾼다.
 * vercel.json 의 /guide rewrite 가 이 파일을 가리킨다.
 * 문구는 RateGuide.tsx 본문의 요약이라, 본문의 결론이나 섹션을 바꾸면 여기도 맞춘다.
 */
const GUIDE_TITLE = "면세점 환율 적용 기준 - 매매기준율·적용환율·기준환율 차이"
const GUIDE_DESCRIPTION =
  "면세점 결제에 쓰이는 환율은 직전 영업일 08시에 고시된 매매기준율입니다. " +
  "주말·공휴일 이월, 은행 환율·면세점 기준환율과의 차이, 법적 근거를 정리했습니다."

function guidePage(): Plugin {
  let outDir = ""
  return {
    name: "guide-page",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const html = readFileSync(join(outDir, "index.html"), "utf8")
      const title = /<title>[^<]*<\/title>/
      const description = /(<meta\s+name="description"\s+content=")[^"]*/
      // index.html 구조가 바뀌어 하나라도 못 찾으면 홈의 사본이 조용히 배포된다.
      if (!title.test(html) || !description.test(html)) {
        throw new Error("guide-page: index.html 에서 <title> 또는 description 을 찾지 못함")
      }
      writeFileSync(
        join(outDir, "guide.html"),
        html
          .replace(title, `<title>${GUIDE_TITLE}</title>`)
          .replace(description, `$1${GUIDE_DESCRIPTION}`),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), latestFixing(), guidePage()],
  // data/ 는 리포 루트에 있고 web/ 바깥이다. ?raw 임포트를 허용하려면 필요하다.
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
})
