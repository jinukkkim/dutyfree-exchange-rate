import { useMemo, useState } from "react"

import { formatRate } from "../lib/format"
import type { Rate } from "../lib/rates"

const RANGES = [
  { label: "1개월", days: 30 },
  { label: "1년", days: 365 },
  { label: "전체", days: Number.POSITIVE_INFINITY },
] as const

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

/** 방법론이 바뀌는 지점에서 끊는다. MAR 과 TWAP 은 같은 선으로 이으면 안 된다. */
function splitByMethod(rates: Rate[]): Rate[][] {
  const segments: Rate[][] = []
  for (const rate of rates) {
    const last = segments.at(-1)
    if (last && last[0].method === rate.method) last.push(rate)
    else segments.push([rate])
  }
  return segments
}

export default function RateChart({ rates }: { rates: Rate[] }) {
  const [days, setDays] = useState<number>(RANGES[0].days)

  // 행을 세면 안 된다. 고시는 영업일에만 있으므로 slice(-30) 은 달력상 약 6 주,
  // slice(-365) 는 약 1.5 년이 된다. 버튼 문구가 "1개월"·"1년" 이므로 달력으로 자른다.
  const visible = useMemo(() => {
    const last = rates.at(-1)
    if (!Number.isFinite(days) || !last) return rates

    const cutoff = new Date(`${last.fixingDate}T00:00:00Z`)
    cutoff.setUTCDate(cutoff.getUTCDate() - days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return rates.filter((rate) => rate.fixingDate >= cutoffIso)
  }, [rates, days])

  const { min, max } = useMemo(() => {
    const values = visible.map((r) => r.rate)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [visible])

  if (visible.length < 2) return null

  const span = max - min || 1
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom

  const x = (index: number) =>
    PAD.left + (index / (visible.length - 1)) * innerWidth
  const y = (rate: number) =>
    PAD.top + (1 - (rate - min) / span) * innerHeight

  let cursor = 0
  const segments = splitByMethod(visible).map((segment) => {
    const start = cursor
    cursor += segment.length
    return segment
      .map((rate, offset) => `${offset === 0 ? "M" : "L"}${x(start + offset).toFixed(1)} ${y(rate.rate).toFixed(1)}`)
      .join(" ")
  })

  return (
    <section className="px-4 py-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-medium text-slate-700">적용환율 추이</h2>
        <div className="flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setDays(range.days)}
              className={
                days === range.days
                  ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                  : "rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              }
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`적용환율 추이, 최저 ${formatRate(min)} 최고 ${formatRate(max)}`}
      >
        <text x={4} y={PAD.top + 4} className="fill-slate-400 text-[10px]">
          {formatRate(max)}
        </text>
        <text x={4} y={HEIGHT - PAD.bottom} className="fill-slate-400 text-[10px]">
          {formatRate(min)}
        </text>
        {segments.map((d, index) => (
          <path
            key={index}
            data-testid="rate-line"
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-slate-800"
          />
        ))}
      </svg>
    </section>
  )
}
