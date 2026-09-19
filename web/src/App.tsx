import { useEffect, useState } from "react"

import ratesCsv from "../../data/rates.csv?raw"

import Footer from "./components/Footer"
import RateChart from "./components/RateChart"
import RateGuide from "./components/RateGuide"
import StalenessBanner from "./components/StalenessBanner"
import TodayTomorrow from "./components/TodayTomorrow"
import { formatKoreanDate } from "./lib/format"
import { isStale } from "./lib/freshness"
import { parseRates, type Rate } from "./lib/rates"

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

/**
 * 제목과 신선도를 한 줄에 둔다.
 *
 * 낡았을 때의 경보는 StalenessBanner 가 따로 띄운다. 여기 초록 점은 그
 * 반대편 —— 멀쩡할 때도 언제 받아온 값인지 말해 주는 자리다. 신선도를
 * 낡았을 때만 말하면, 아무 표시가 없는 화면이 "확인했음"인지 "확인 못
 * 했음"인지 구별되지 않는다.
 */
function PageHeader({
  rates,
  today,
  now,
}: {
  rates: Rate[]
  today: string
  now: Date
}) {
  const latest = rates.at(-1)
  const fresh = latest && !isStale(latest.collectedAt, now)

  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-rule px-4 pb-3.5 pt-[52px]">
      <h1 className="text-[17px] font-bold tracking-[-0.01em]">
        면세점 적용환율
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted">{formatKoreanDate(today)}</span>
        {fresh && (
          <span className="flex items-center gap-1.5 text-[11px] text-fresh">
            <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
            {latest.collectedAt.slice(11, 16)} 수집
          </span>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const route = useHashRoute()
  const today = todayKst()
  const now = new Date()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl">
        <main>
          {route === "#/guide" ? (
            <RateGuide />
          ) : (
            <>
              <StalenessBanner rates={rates} now={now} />
              <PageHeader rates={rates} today={today} now={now} />
              <TodayTomorrow rates={rates} today={today} />
              <RateChart rates={rates} today={today} />
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  )
}
