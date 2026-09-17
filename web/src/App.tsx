import ratesCsv from "../../data/rates.csv?raw"

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

export default function App() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-slate-900">
      <StalenessBanner rates={rates} now={new Date()} />
      <TodayTomorrow rates={rates} today={todayKst()} />
    </main>
  )
}
