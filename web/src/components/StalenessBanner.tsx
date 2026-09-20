import { isStale } from "../lib/freshness"
import type { Rate } from "../lib/rates"

export default function StalenessBanner({
  rates,
  now,
}: {
  rates: Rate[]
  now: Date
}) {
  const latest = rates.at(-1)
  if (!latest || !isStale(latest.collectedAt, now)) return null

  return (
    /* 배경은 내비 바처럼 전면으로 깔되 글은 본문 단 안에 둔다. 폭을 안
       잡으면 이 줄만 화면 끝까지 늘어나 아래 820px 단과 어긋난다. */
    <div
      role="status"
      className="border-b border-rule bg-warnTint px-6 py-3 text-[13px] text-warn"
    >
      <p className="mx-auto max-w-page">
        ⚠ 이 데이터는 {latest.collectedAt.slice(0, 10)} 이후 갱신되지 않았습니다.
      </p>
    </div>
  )
}
