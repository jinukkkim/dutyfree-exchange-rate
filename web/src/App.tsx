import { Analytics } from "@vercel/analytics/react"

import ratesCsv from "../../data/rates.csv?raw"

import Footer from "./components/Footer"
import RateChart from "./components/RateChart"
import RateGuide, { RateGuideEn } from "./components/RateGuide"
import TodayTomorrow from "./components/TodayTomorrow"
import type { Lang } from "./lib/format"
import { parseRates } from "./lib/rates"

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

const SITE_TITLE = "text-[13px] font-semibold tracking-[-0.01em]"

export default function App() {
  // 링크가 평범한 <a> 라서 페이지 전환이 곧 새 문서 로드다. 라우팅 상태도,
  // 스크롤 리셋도 브라우저가 한다. 대신 /guide 직접 접속이 index.html 로
  // 떨어져야 하고, 그 몫은 vercel.json 의 rewrite 가 진다.
  // 끝의 / 를 떼어 /guide/ 도 같은 경로로 본다. "/" 는 ""가 되지만 어차피 else 다.
  const route = window.location.pathname.replace(/\/+$/, "")
  const today = todayKst()
  const lang: Lang = route === "/en" || route.startsWith("/en/") ? "en" : "ko"
  const isGuide = route === "/guide" || route === "/en/guide"
  const siteName = lang === "en" ? "Korea Duty Free Exchange Rate" : "면세점 적용환율"
  const otherLang =
    lang === "en"
      ? { href: isGuide ? "/guide" : "/", code: "ko", label: "한국어" }
      : { href: isGuide ? "/en/guide" : "/en", code: "en", label: "English" }

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
          <a
            href={otherLang.href}
            hrefLang={otherLang.code}
            lang={otherLang.code}
            className="shrink-0 text-[13px] text-link hover:underline"
          >
            {otherLang.label}
          </a>
        </div>
      </header>

      <main className="flex-grow">
        {isGuide ? (
          <div className="mx-auto max-w-2xl">
            {lang === "en" ? <RateGuideEn /> : <RateGuide />}
          </div>
        ) : (
          <>
            <TodayTomorrow rates={rates} today={today} lang={lang} />
            <RateChart rates={rates} today={today} lang={lang} />
          </>
        )}
      </main>

      <Footer latestFixingDate={rates.at(-1)?.fixingDate} lang={lang} />

      {/* 운영 확인용 방문자 집계. 프로덕션에서만 전송하고 dev 에선 no-op 이다.
          경로가 진짜 URL 이라 /guide 가 제 몫으로 잡힌다. */}
      <Analytics />
    </div>
  )
}
