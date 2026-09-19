import { useMemo, useState } from "react"

import { formatRate } from "../lib/format"
import { isTomorrowConfirmed, nextDay, type Rate } from "../lib/rates"

const RANGES = [
  { label: "1개월", days: 30 },
  { label: "6개월", days: 182 },
  { label: "1년", days: 365 },
  { label: "5년", days: 1826 },
  { label: "전체", days: Number.POSITIVE_INFINITY },
] as const

const DEFAULT_DAYS = 30

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }
const TOOLTIP = { width: 150, height: 22 }

type Point = { date: string; rate: number; method: Rate["method"] }

/** "2026-08-19" → "08.19". 축 눈금은 연도를 적을 자리가 없다. */
function monthDay(iso: string): string {
  return iso.slice(5).replace("-", ".")
}

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
    if (!Number.isFinite(days) || !last) return series

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
      <section className="px-4 pt-[52px]">
        <ChartHeader days={days} setDays={setDays} />
        <p className="py-10 text-center text-sm text-muted">
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
    <section className="px-4 pt-[52px]">
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
        <text x={4} y={PAD.top + 4} className="fill-muted text-[10px]">
          {formatRate(max)}
        </text>
        <text x={4} y={HEIGHT - PAD.bottom} className="fill-muted text-[10px]">
          {formatRate(min)}
        </text>

        {/* 오늘이 어디인지 그어 준다. 이 선 오른쪽은 아직 겪지 않은 날이다. */}
        {futureStart > 0 && (
          <line
            x1={x(futureStart - 1)}
            y1={PAD.top}
            x2={x(futureStart - 1)}
            y2={HEIGHT - PAD.bottom}
            stroke="currentColor"
            strokeDasharray="2 3"
            className="text-[#CDD2D4]"
          />
        )}

        {pastPaths.map((d, index) => (
          <path
            key={index}
            data-testid="rate-line"
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-ink"
          />
        ))}

        {/* MAR 과 TWAP 은 잇지 않는다. 전환 당일 하루는 내일 구간이 그려지지
            않고, 오늘 세로선 오른쪽이 비어 있는 것으로만 보인다. */}
        {future.length >= 2 && future[0].method === future[1].method && (
          <path
            data-testid="rate-line-future"
            d={toPath(future, futureStart - 1)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="text-ink"
          />
        )}

        <text x={PAD.left} y={HEIGHT - 8} className="fill-muted text-[10px]">
          {monthDay(visible[0].date)}
        </text>
        {visible.length >= 6 && (
          <text
            x={x(Math.floor((visible.length - 1) / 2))}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-muted text-[10px]"
          >
            {monthDay(visible[Math.floor((visible.length - 1) / 2)].date)}
          </text>
        )}
        {futureStart > 0 && (
          <text
            x={x(futureStart - 1)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-sub text-[10px]"
          >
            오늘
          </text>
        )}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={x(hover!)}
              y1={PAD.top}
              x2={x(hover!)}
              y2={HEIGHT - PAD.bottom}
              stroke="currentColor"
              className="text-[#CDD2D4]"
            />
            <circle cx={x(hover!)} cy={y(hovered.rate)} r={3} className="fill-ink" />
            <rect
              x={Math.min(
                Math.max(x(hover!) - TOOLTIP.width / 2, 0),
                WIDTH - TOOLTIP.width,
              )}
              y={Math.max(y(hovered.rate) - TOOLTIP.height - 8, 0)}
              width={TOOLTIP.width}
              height={TOOLTIP.height}
              rx={4}
              className="fill-ink"
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
              className="fill-paper font-num text-[11px] tabular-nums"
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
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 className="text-[15px] font-bold text-sub">적용환율 추이</h2>
      <div className="flex gap-0.5">
        {RANGES.map((range) => (
          <button
            key={range.label}
            type="button"
            onClick={() => setDays(range.days)}
            className={
              days === range.days
                ? "bg-ink px-2 py-1 text-xs font-medium text-paper"
                : "px-2 py-1 text-xs font-medium text-muted hover:bg-black/5"
            }
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  )
}
