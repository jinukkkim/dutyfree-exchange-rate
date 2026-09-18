import { useMemo, useState } from "react"

import { formatRate } from "../lib/format"
import { isTomorrowConfirmed, nextDay, type Rate } from "../lib/rates"

const RANGES = [
  { label: "1주", days: 7 },
  { label: "1개월", days: 30 },
  { label: "6개월", days: 182 },
  { label: "1년", days: 365 },
  { label: "5년", days: 1826 },
] as const

const DEFAULT_DAYS = 30

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }
const TOOLTIP = { width: 150, height: 22 }

type Point = { date: string; rate: number; method: Rate["method"] }

/** 방법론이 바뀌는 지점에서 끊는다. MAR 과 TWAP 은 같은 선으로 이으면 안 된다. */
function splitByMethod(points: Point[]): Point[][] {
  const segments: Point[][] = []
  for (const point of points) {
    const last = segments.at(-1)
    if (last && last[0].method === point.method) last.push(point)
    else segments.push([point])
  }
  return segments
}

export default function RateChart({
  rates,
  today,
}: {
  rates: Rate[]
  today: string
}) {
  const [days, setDays] = useState<number>(DEFAULT_DAYS)
  const [hover, setHover] = useState<number | null>(null)

  // 차트의 x 축은 고시일이 아니라 **적용일**이다. 고시 D 는 D+1 에 적용되므로,
  // 마지막 고시(오늘 08:00)는 내일 적용분이 되어 미래 구간으로 자동으로 들어온다.
  const series = useMemo<Point[]>(() => {
    const points = rates.map((rate) => ({
      date: nextDay(rate.fixingDate),
      rate: rate.rate,
      method: rate.method,
    }))

    // 주말·공휴일에는 내일 적용분이 직전 고시의 이월이라 새 점이 생기지 않는다.
    // 그래도 차트는 내일까지 닿아야 하므로 같은 값으로 하루 늘린다.
    const last = points.at(-1)
    const tomorrow = nextDay(today)
    if (last && last.date < tomorrow && isTomorrowConfirmed(rates, today)) {
      points.push({ ...last, date: tomorrow })
    }
    return points
  }, [rates, today])

  // 행을 세면 안 된다. 고시는 영업일에만 있으므로 slice(-30) 은 달력상 약 6 주,
  // slice(-365) 는 약 1.5 년이 된다. 버튼 문구가 "1개월"·"1년" 이므로 달력으로 자른다.
  const visible = useMemo(() => {
    const last = series.at(-1)
    if (!last) return series

    const cutoff = new Date(`${last.date}T00:00:00Z`)
    cutoff.setUTCDate(cutoff.getUTCDate() - days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return series.filter((point) => point.date >= cutoffIso)
  }, [series, days])

  const { min, max } = useMemo(() => {
    const values = visible.map((point) => point.rate)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [visible])

  // 선을 그리려면 점이 둘은 있어야 한다. 다만 섹션을 통째로 지우면 구간 버튼까지
  // 사라져 빠져나갈 길이 없다 — 연휴로 고시가 7일 넘게 비는 해가 실제로 있다
  // (2017 추석 11일, 2025 추석 8일). 버튼은 남기고 안내만 바꾼다.
  if (visible.length < 2) {
    return (
      <section className="px-4 py-8">
        <ChartHeader days={days} setDays={setDays} />
        <p className="py-10 text-center text-sm text-slate-400">
          이 구간에는 고시가 없습니다. 더 긴 구간을 선택해 주세요.
        </p>
      </section>
    )
  }


  const span = max - min || 1
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom

  const x = (index: number) =>
    PAD.left + (index / (visible.length - 1)) * innerWidth
  const y = (rate: number) => PAD.top + (1 - (rate - min) / span) * innerHeight

  const toPath = (points: Point[], start: number) =>
    points
      .map(
        (point, offset) =>
          `${offset === 0 ? "M" : "L"}${x(start + offset).toFixed(1)} ${y(point.rate).toFixed(1)}`,
      )
      .join(" ")

  // 아직 오지 않은 날의 적용환율은 이미 확정돼 있다(오늘 고시 = 내일 적용).
  // 확정이지만 겪지 않은 구간이므로 실선과 구분해 점선으로 잇는다.
  const futureStart = visible.findIndex((point) => point.date > today)
  const past = futureStart === -1 ? visible : visible.slice(0, futureStart)
  const future =
    futureStart <= 0 ? [] : visible.slice(futureStart - 1)

  let cursor = 0
  const pastPaths = splitByMethod(past).map((segment) => {
    const path = toPath(segment, cursor)
    cursor += segment.length
    return path
  })

  /** 커서 x 좌표에서 가장 가까운 데이터 포인트. viewBox 좌표로 되돌려 계산한다. */
  function pointAt(clientX: number, target: SVGSVGElement) {
    const box = target.getBoundingClientRect()
    const viewX = ((clientX - box.left) / box.width) * WIDTH
    const index = Math.round(
      ((viewX - PAD.left) / innerWidth) * (visible.length - 1),
    )
    setHover(index >= 0 && index < visible.length ? index : null)
  }

  const hovered = hover === null ? null : visible[hover]

  return (
    <section className="px-4 py-8">
      <ChartHeader days={days} setDays={setDays} />

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`적용환율 추이, 최저 ${formatRate(min)} 최고 ${formatRate(max)}`}
        onMouseMove={(event) => pointAt(event.clientX, event.currentTarget)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (touch) pointAt(touch.clientX, event.currentTarget)
        }}
        onTouchEnd={() => setHover(null)}
      >
        <text x={4} y={PAD.top + 4} className="fill-slate-400 text-[10px]">
          {formatRate(max)}
        </text>
        <text x={4} y={HEIGHT - PAD.bottom} className="fill-slate-400 text-[10px]">
          {formatRate(min)}
        </text>

        {pastPaths.map((d, index) => (
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

        {/* 잇는 선과 점을 따로 건다. MAR/TWAP 경계에서 이어서는 안 되는 것은
            **선**이지 점이 아닌데, 한 가드에 묶어두면 경계에 걸리는 하루만
            내일 표식이 통째로 사라진다. */}
        {future.length >= 2 && future[0].method === future[1].method && (
          <path
            data-testid="rate-line-future"
            d={toPath(future, futureStart - 1)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="text-amber-500"
          />
        )}

        {futureStart !== -1 && (
          <circle
            data-testid="rate-point-future"
            cx={x(visible.length - 1)}
            cy={y(visible.at(-1)!.rate)}
            r={3.5}
            className="fill-amber-500"
          />
        )}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={x(hover!)}
              y1={PAD.top}
              x2={x(hover!)}
              y2={HEIGHT - PAD.bottom}
              stroke="currentColor"
              className="text-slate-300"
            />
            <circle cx={x(hover!)} cy={y(hovered.rate)} r={3} className="fill-slate-900" />
            <rect
              x={Math.min(
                Math.max(x(hover!) - TOOLTIP.width / 2, 0),
                WIDTH - TOOLTIP.width,
              )}
              y={Math.max(y(hovered.rate) - TOOLTIP.height - 8, 0)}
              width={TOOLTIP.width}
              height={TOOLTIP.height}
              rx={4}
              className="fill-slate-900"
            />
            <text
              x={
                Math.min(
                  Math.max(x(hover!) - TOOLTIP.width / 2, 0),
                  WIDTH - TOOLTIP.width,
                ) +
                TOOLTIP.width / 2
              }
              y={Math.max(y(hovered.rate) - TOOLTIP.height - 8, 0) + 15}
              textAnchor="middle"
              className="fill-white text-[11px] tabular-nums"
            >
              {hovered.date} · {formatRate(hovered.rate)}
              {hovered.date > today ? " (내일)" : ""}
            </text>
          </g>
        )}
      </svg>
    </section>
  )
}

/** 데이터가 모자라 차트를 못 그리는 경우에도 이 헤더는 남는다. */
function ChartHeader({
  days,
  setDays,
}: {
  days: number
  setDays: (days: number) => void
}) {
  return (
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
  )
}
