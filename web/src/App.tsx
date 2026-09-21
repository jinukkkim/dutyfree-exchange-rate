import { Analytics } from "@vercel/analytics/react"
import { useEffect, useState } from "react"

import ratesCsv from "../../data/rates.csv?raw"

import Footer from "./components/Footer"
import RateChart from "./components/RateChart"
import RateGuide from "./components/RateGuide"
import StalenessBanner from "./components/StalenessBanner"
import TodayTomorrow from "./components/TodayTomorrow"
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

/**
 * 페이지가 둘뿐이라 해시로 가른다. 라우터를 넣을 이유도, 정적 호스팅에
 * rewrite 규칙을 붙일 이유도 아직 없다.
 */
function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])
  return hash
}

const SITE_TITLE =
  "mx-auto w-full max-w-page text-[13px] font-semibold tracking-[-0.01em]"

export default function App() {
  const route = useHashRoute()
  const today = todayKst()

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      {/* 내비 바의 제목은 본문 라우트에서만 h1 이다. 가이드 페이지는 자기
          h1 을 이미 갖고 있어서, 여기서도 h1 을 내면 한 화면에 최상위 제목이
          둘이 되고 헤딩으로 훑는 사용자가 어느 쪽이 페이지 제목인지 알 수 없다. */}
      <header className="flex h-12 items-center border-b border-rule bg-nav px-6">
        {route === "#/guide" ? (
          <div className={SITE_TITLE}>면세점 적용환율</div>
        ) : (
          <h1 className={SITE_TITLE}>면세점 적용환율</h1>
        )}
      </header>

      <main className="flex-grow">
        {route === "#/guide" ? (
          <div className="mx-auto max-w-2xl">
            <RateGuide />
          </div>
        ) : (
          <>
            <StalenessBanner rates={rates} now={new Date()} />
            <TodayTomorrow rates={rates} today={today} />
            <RateChart rates={rates} today={today} />
          </>
        )}
      </main>

      <Footer />

      {/* 운영 확인용 방문자 집계. 프로덕션에서만 전송하고 dev 에선 no-op 이다.
          ponytail: 해시 라우트를 구분하지 못해 #/guide 가 / 로 뭉뚱그려진다.
          가이드 조회수가 실제로 필요해지면 hashchange 마다 track() 을 쏜다. */}
      <Analytics />
    </div>
  )
}
