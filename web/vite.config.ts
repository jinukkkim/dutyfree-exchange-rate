import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import react from "@vitejs/plugin-react"
import subsetFont from "subset-font"
import { defineConfig, type Plugin } from "vite"

import { ogDescription, renderOgImage, searchDescription } from "./og"
import { parseRates } from "./src/lib/rates"

const readRates = () =>
  parseRates(readFileSync(new URL("../data/rates.csv", import.meta.url), "utf8"))

/**
 * 최신 고시를 index.html 에 문장으로 박는다. 네이버 크롤러는 JS 를 거의
 * 돌리지 않아서, 이게 없으면 검색 결과에 숫자가 안 나온다. 링크 미리보기는
 * 일부러 다음 적용 환율을 숨기므로 이 문장 대신 og.ts 의 문장을 쓴다.
 * Vercel 이 data 커밋마다 재빌드하므로 문장은 최신 고시와 함께 갱신된다.
 */
function latestFixing(): Plugin {
  return {
    name: "latest-fixing",
    transformIndexHtml(html) {
      return html.replaceAll("%LATEST_FIXING%", searchDescription(readRates()))
    },
  }
}

/**
 * 링크 미리보기의 설명과 이미지(og.png)를 최신 고시로 만든다 (og.ts).
 * 이미지 주소에 고시일을 붙여, 미리보기를 다시 긁어 갈 때 새 이미지를 받게 한다.
 * 파일 이름은 그대로라 예전 주소로 캐시된 카드도 깨지지 않는다.
 */
function ogPreview(): Plugin {
  return {
    name: "og-preview",
    transformIndexHtml(html) {
      const rates = readRates()
      return html
        .replaceAll("%OG_DESCRIPTION%", ogDescription(rates))
        .replaceAll("%OG_VERSION%", rates.at(-1)?.fixingDate ?? "")
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "og.png", source: renderOgImage(readRates()) })
    },
  }
}

/**
 * /guide·/en·/ja 와 그 /guide 전용 HTML. 앱은 한 장짜리라 이 주소들도 index.html 을
 * 받는데, 그러면 검색 결과에서 홈과 제목·설명이 같아 구분이 안 된다 (네이버 CTR 0.3%).
 * 크롤러는 JS 로 바꾼 제목을 읽지 않으니 빌드 결과를 복사해 제목·설명과,
 * 구글이 홈의 중복으로 묶지 않도록 canonical·hreflang·크롤러용 본문 문장을 바꾼다.
 * vercel.json 의 rewrite 가 이 파일들을 가리킨다.
 * 문구는 RateGuide.tsx 본문의 요약이라, 본문의 결론이나 섹션을 바꾸면 여기도 맞춘다.
 */
const ORIGIN = "https://dutyfreerate.com"
const EN_TITLE = "Korea Duty Free Exchange Rate - Today and Tomorrow"
const EN_GUIDE_TITLE = "How Korea Duty Free Exchange Rates Work"
const EN_GUIDE_DESCRIPTION =
  "Korean duty free prices are set in US dollars and converted to won at a rate published on the " +
  "previous business day. Learn which rate applies and why tomorrow's is already known."

const JA_TITLE = "韓国免税店の為替レート - 今日と明日"
const JA_GUIDE_TITLE = "韓国免税店の為替レートの決まり方"
const JA_GUIDE_DESCRIPTION =
  "韓国免税店の価格は米ドルで決められ、前営業日に公表されたレートでウォンに換算されます。" +
  "適用されるレート、カード払いでウォンを選ぶ理由、明日のレートがもう分かる理由を解説します。"

const FOREIGN = {
  en: { locale: "en_US", og: "See the exchange rate Korean duty free shops apply today and tomorrow." },
  ja: { locale: "ja_JP", og: "韓国の免税店で今日と明日に適用される為替レートを確認できます。" },
} as const

const GUIDE_TITLE = "면세점 환율 적용 기준 - 매매기준율·적용환율·기준환율 차이"
const GUIDE_DESCRIPTION =
  "면세점 결제에 쓰이는 환율은 직전 영업일 08시에 고시된 매매기준율입니다. " +
  "주말·공휴일 이월, 은행 환율·면세점 기준환율과의 차이, 법적 근거를 정리했습니다."

type StaticPage = { file: string; path: string; title: string; description: string }

function renderStaticPage(html: string, page: StaticPage): string {
  const lang = page.path.match(/^\/(en|ja)(?=\/|$)/)?.[1] as keyof typeof FOREIGN | undefined
  const koPath = page.path.replace(/^\/(en|ja)/, "") || "/"
  const localized = (code: string) => ORIGIN + (koPath === "/" ? `/${code}` : `/${code}${koPath}`)
  const edits: [RegExp, string][] = [
    [/(<title>)[^<]*/, page.title],
    [/(<meta\s+name="description"\s+content=")[^"]*/, page.description],
    [/(<link\s+rel="canonical"\s+href=")[^"]*/, ORIGIN + page.path],
    [/(<link\s+rel="alternate"\s+hreflang="ko"\s+href=")[^"]*/, ORIGIN + koPath],
    [/(<link\s+rel="alternate"\s+hreflang="en"\s+href=")[^"]*/, localized("en")],
    [/(<link\s+rel="alternate"\s+hreflang="ja"\s+href=")[^"]*/, localized("ja")],
    [/(<link\s+rel="alternate"\s+hreflang="x-default"\s+href=")[^"]*/, localized("en")],
    [/(<div id="root">\s*<p[^>]*>)[^<]*/, page.description],
  ]
  if (lang) {
    edits.push(
      [/(<html\s+lang=")[^"]*/, lang],
      [/(<meta\s+property="og:locale"\s+content=")[^"]*/, FOREIGN[lang].locale],
      [/(<meta\s+property="og:site_name"\s+content=")[^"]*/, "DutyFreeRate"],
      [/(<meta\s+property="og:title"\s+content=")[^"]*/, page.title],
      [/(<meta\s+property="og:description"\s+content=")[^"]*/, FOREIGN[lang].og],
    )
  }

  let result = html
  for (const [pattern, value] of edits) {
    // index.html 구조가 바뀌어 하나라도 못 찾으면 홈의 사본이 조용히 배포된다.
    if (!pattern.test(result)) throw new Error(`static-pages: ${page.file} 에서 ${pattern} 을 찾지 못함`)
    result = result.replace(pattern, (_match, head: string) => head + value)
  }
  // 미리보기 이미지는 한국어뿐이라 외국어 페이지에서는 뺀다.
  return lang ? result.replace(/\s*<meta\s+(?:property="og:image|name="twitter:card")[^>]*>/g, "") : result
}

function staticPages(): Plugin {
  let outDir = ""
  return {
    name: "static-pages",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const html = readFileSync(join(outDir, "index.html"), "utf8")
      const pages: StaticPage[] = [
        { file: "guide.html", path: "/guide", title: GUIDE_TITLE, description: GUIDE_DESCRIPTION },
        { file: "en.html", path: "/en", title: EN_TITLE, description: searchDescription(readRates(), "en") },
        { file: "en-guide.html", path: "/en/guide", title: EN_GUIDE_TITLE, description: EN_GUIDE_DESCRIPTION },
        { file: "ja.html", path: "/ja", title: JA_TITLE, description: searchDescription(readRates(), "ja") },
        { file: "ja-guide.html", path: "/ja/guide", title: JA_GUIDE_TITLE, description: JA_GUIDE_DESCRIPTION },
      ]
      for (const page of pages) writeFileSync(join(outDir, page.file), renderStaticPage(html, page))
    },
  }
}

/**
 * Pretendard 원본(2MB)을 이 사이트에 실제로 쓰인 글자만 남긴 파일로 바꾼다.
 * 화면의 글자는 전부 JS 번들 안의 문자열에서 나오므로(요일도 format.ts 에
 * 박혀 있다) 번들 코드가 곧 글자 목록이다. 글자 목록이 바뀌어도 파일 이름은
 * 원본 해시 그대로지만, Vercel 이 정적 파일을 매번 재검증하므로 낡은 파일이
 * 남지 않는다.
 *
 * 폰트는 React 가 그린 뒤에야 쓰이므로, 기다리지 않게 HTML 에서 미리 받는다.
 */
const PRETENDARD = /PretendardVariable-[\w-]+\.woff2$/

function pretendardSubset(): Plugin {
  return {
    name: "pretendard-subset",
    apply: "build",
    transformIndexHtml(_html, ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find((name) => PRETENDARD.test(name))
      if (!font) throw new Error("pretendard-subset: 번들에서 Pretendard 파일을 찾지 못함")
      return [
        {
          tag: "link",
          attrs: { rel: "preload", href: `/${font}`, as: "font", type: "font/woff2", crossorigin: "" },
          injectTo: "head",
        },
      ]
    },
    async generateBundle(_options, bundle) {
      const font = Object.values(bundle).find((file) => PRETENDARD.test(file.fileName))
      if (font?.type !== "asset") throw new Error("pretendard-subset: 번들에서 Pretendard 파일을 찾지 못함")
      const code = Object.values(bundle)
        .map((file) => (file.type === "chunk" ? file.code : ""))
        .join("")
      // esbuild 가 한글을 \uXXXX 로 내보내면 목록이 비어 영문만 남은 폰트가 배포된다.
      if (!/[가-힣]/.test(code)) throw new Error("pretendard-subset: 번들에서 한글을 찾지 못함")
      font.source = await subsetFont(Buffer.from(font.source), code, { targetFormat: "woff2" })
    },
  }
}

export default defineConfig({
  plugins: [react(), latestFixing(), ogPreview(), staticPages(), pretendardSubset()],
  // data/ 는 리포 루트에 있고 web/ 바깥이다. ?raw 임포트를 허용하려면 필요하다.
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
})
