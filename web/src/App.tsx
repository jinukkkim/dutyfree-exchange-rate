import { Analytics } from "@vercel/analytics/react"

import jpyCsv from "../../data/jpy.csv?raw"
import ratesCsv from "../../data/rates.csv?raw"

import Footer from "./components/Footer"
import RateChart from "./components/RateChart"
import RateGuide, { RateGuideEn, RateGuideJa } from "./components/RateGuide"
import TodayTomorrow from "./components/TodayTomorrow"
import { pick, type Lang } from "./lib/format"
import { latestYen, parseRates } from "./lib/rates"

// 전량이 100KB 수준이라 번들에 싣는다. fetch 폭포와 로딩 상태가 사라지고,
// "두 숫자"가 첫 페인트에 이미 들어 있다.
const rates = parseRates(ratesCsv)

/** KST 기준 오늘 날짜. 방문자의 타임존과 무관하게 한국 날짜여야 한다. */
function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

const LANGS: { code: Lang; prefix: string; label: string }[] = [
  { code: "ko", prefix: "", label: "한국어" },
  { code: "en", prefix: "/en", label: "English" },
  { code: "ja", prefix: "/ja", label: "日本語" },
]

const SITE_TITLE = "text-[13px] font-semibold tracking-[-0.01em]"

export default function App() {
  // 링크가 평범한 <a> 라서 페이지 전환이 곧 새 문서 로드다. 라우팅 상태도,
  // 스크롤 리셋도 브라우저가 한다. 대신 /guide 직접 접속이 index.html 로
  // 떨어져야 하고, 그 몫은 vercel.json 의 rewrite 가 진다.
  // 끝의 / 를 떼어 /guide/ 도 같은 경로로 본다. "/" 는 ""가 되지만 어차피 else 다.
  const route = window.location.pathname.replace(/\/+$/, "")
  const today = todayKst()
  const lang = (route.match(/^\/(en|ja)(?=\/|$)/)?.[1] ?? "ko") as Lang
  // 언어별 정적 HTML 은 /en·/ja 와 그 /guide 뿐이다. /ja/foo 같은 나머지 경로는
  // lang="ko" 인 index.html 을 받으므로, 스크린리더·번역기가 본문을 한국어로 읽지 않게 맞춘다.
  document.documentElement.lang = lang
  const isGuide = route.replace(/^\/(en|ja)/, "") === "/guide"
  // 가이드에는 환산할 숫자가 없으니 푸터의 엔 환산 안내도 뺀다.
  const yen = lang === "ja" && !isGuide ? latestYen(jpyCsv, today) : null
  const siteName = pick(lang)("면세점 적용환율", "Korea Duty Free Exchange Rate", "韓国免税店の為替レート")
  const otherLangs = LANGS.filter((other) => other.code !== lang).map((other) => ({
    ...other,
    href: other.prefix + (isGuide ? "/guide" : "") || "/",
  }))

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      {/* 내비 바의 제목은 본문 라우트에서만 h1 이다. 가이드 페이지는 자기
          h1 을 이미 갖고 있어서, 여기서도 h1 을 내면 한 화면에 최상위 제목이
          둘이 되고 헤딩으로 훑는 사용자가 어느 쪽이 페이지 제목인지 알 수 없다. */}
      <header className="flex h-12 items-center border-b border-rule bg-nav px-6">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4">
          {isGuide ? (
            <div className={SITE_TITLE}>{siteName}</div>
          ) : (
            <h1 className={SITE_TITLE}>{siteName}</h1>
          )}
          <nav aria-label={pick(lang)("언어", "Language", "言語")} className="flex shrink-0 gap-3">
            {otherLangs.map((other) => (
              <a
                key={other.code}
                href={other.href}
                hrefLang={other.code}
                lang={other.code}
                className="text-[13px] text-link hover:underline"
              >
                {other.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {isGuide ? (
          <div className="mx-auto max-w-2xl">
            {pick(lang)(<RateGuide />, <RateGuideEn />, <RateGuideJa />)}
          </div>
        ) : (
          <>
            <TodayTomorrow rates={rates} today={today} lang={lang} yen={yen} />
            <RateChart rates={rates} today={today} lang={lang} />
          </>
        )}
      </main>

      <Footer latestFixingDate={rates.at(-1)?.fixingDate} lang={lang} yen={yen} />

      {/* 운영 확인용 방문자 집계. 프로덕션에서만 전송하고 dev 에선 no-op 이다.
          경로가 진짜 URL 이라 /guide 가 제 몫으로 잡힌다. */}
      <Analytics />
    </div>
  )
}
