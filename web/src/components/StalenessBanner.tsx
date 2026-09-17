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
    <div
      role="status"
      className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-900"
    >
      ⚠ 이 데이터는 {latest.collectedAt.slice(0, 10)} 이후 갱신되지 않았습니다.
    </div>
  )
}
