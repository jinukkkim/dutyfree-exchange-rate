import { useEffect, useId, useRef, useState, type TouchEvent } from "react"

import baseRatesCsv from "../../../data/base_rates.csv?raw"
import meta from "../../../data/meta.json"

import { parseBaseRateChanges } from "../lib/baseRates"

const changes = parseBaseRateChanges(baseRatesCsv).reverse()
const latest = changes[changes.length - 1]
const HEIGHT = 240
const PAD = { left: 56, right: 16, top: 16, bottom: 28 }
const values = changes.map((change) => change.rate)
const min = Math.min(...values)
const max = Math.max(...values)
// 월 단위 자료의 정밀도를 유지하면서 실제 개월 간격에 비례해 배치한다.
const times = changes.map(({ period }) => {
  const [year, month] = period.split("-").map(Number)
  return year * 12 + month - 1
})
const firstMonth = times[0]
const [verifiedYear, verifiedMonth] = meta.base_rates_verified_at.split("-").map(Number)
const lastMonth = Math.max(times[times.length - 1], verifiedYear * 12 + verifiedMonth - 1)
const monthSpan = lastMonth - firstMonth
const plotMin = min - 25
const plotMax = max + 25
const y = (rate: number) => PAD.top + ((plotMax - rate) / (plotMax - plotMin)) * (HEIGHT - PAD.top - PAD.bottom)
const ticks = Array.from({ length: (max - min) / 50 + 1 }, (_, index) => min + index * 50)
const month = (period: string) => period.replace("-", ".") + "."
const amount = (rate: number) => rate.toLocaleString("ko-KR")
const axisMonths = Array.from(new Set([firstMonth, firstMonth + Math.round(monthSpan / 2), lastMonth]))
const axisLabel = (time: number) => `${Math.floor(time / 12)}.${String(time % 12 + 1).padStart(2, "0")}.`

export default function BaseRateChart() {
  const descriptionId = useId()
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const hovered = hover === null ? null : changes[times.reduce((latest, time, index) => time <= hover ? index : latest, 0)]
  const innerWidth = width - PAD.left - PAD.right
  const xMonth = (time: number) => PAD.left + ((time - firstMonth) / (monthSpan || 1)) * innerWidth
  const path = changes.map((change, index) =>
    index === 0 ? `M ${xMonth(times[index])} ${y(change.rate)}` : `H ${xMonth(times[index])} V ${y(change.rate)}`,
  ).join(" ") + ` H ${xMonth(lastMonth)}`
  const area = `${path} L ${xMonth(lastMonth)} ${HEIGHT - PAD.bottom} L ${xMonth(firstMonth)} ${HEIGHT - PAD.bottom} Z`

  useEffect(() => {
    const node = container.current
    if (!node) return
    const measure = () => {
      const nextWidth = node.getBoundingClientRect().width
      if (nextWidth > 0) setWidth(nextWidth)
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function pointAt(clientX: number, target: SVGSVGElement) {
    const box = target.getBoundingClientRect()
    const viewX = ((clientX - box.left) / box.width) * width
    if (viewX < PAD.left || viewX > width - PAD.right) {
      setHover(null)
      return
    }
    const time = firstMonth + Math.round(((viewX - PAD.left) / innerWidth) * monthSpan)
    setHover(time)
  }

  function touchAt(event: TouchEvent<SVGSVGElement>) {
    const touch = event.touches[0]
    if (touch) pointAt(touch.clientX, event.currentTarget)
  }

  return (
    <figure className="mt-6 text-ink">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div role="group" aria-label="최근 기준환율" className="tabular-nums">
          <p className="text-xs text-muted">{axisLabel(lastMonth)}</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[32px] font-semibold leading-tight tracking-[-0.04em] sm:text-[38px]">{amount(latest.rate)}</span>
            <span className="text-xs text-muted">원/달러</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-semibold tracking-[-0.02em]">면세점 기준환율</p>
          <p className="mt-1 text-xs text-muted">국산품</p>
        </div>
      </div>
      <div ref={container} className="relative pt-7">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="block h-60 w-full touch-none"
          role="img" aria-label="면세점 기준환율(국산품용) 변경 추이" aria-describedby={descriptionId}
          onMouseMove={(event) => pointAt(event.clientX, event.currentTarget)} onMouseLeave={() => setHover(null)}
          onTouchStart={touchAt} onTouchMove={touchAt} onTouchEnd={() => setHover(null)} onTouchCancel={() => setHover(null)}>
          <desc id={descriptionId}>
            확인된 변경 사건을 시간순으로 표시하며, 가로 간격은 실제 개월 수에 비례합니다.
            월별 선택 값은 해당 월까지 확인된 마지막 변경 값을 표시합니다.
            마지막 변경 이후 조사한 {month(meta.base_rates_verified_at.slice(0, 7))}까지 같은 값을 이어 표시합니다.
            {changes.map((change) => `${month(change.period)} ${amount(change.rate)}원/달러`).join(", ")}
          </desc>
          <path d={area} className="fill-key/[0.08]" />
          {ticks.map((rate) => (
            <g key={rate}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(rate)} y2={y(rate)} className="stroke-rule/50" />
              <text x={PAD.left - 12} y={y(rate)} dominantBaseline="middle" textAnchor="end" className="fill-muted text-[11px] tabular-nums">{amount(rate)}</text>
            </g>
          ))}
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="text-key" />
          {hovered && (
            <g pointerEvents="none">
              <line x1={xMonth(hover!)} x2={xMonth(hover!)} y1="0" y2={HEIGHT - PAD.bottom} stroke="currentColor" className="text-rule" />
              <circle cx={xMonth(hover!)} cy={y(hovered.rate)} r="3.5" className="fill-key" />
            </g>
          )}
        </svg>
        {hovered && (
          <div aria-hidden="true" data-testid="base-rate-hover-label"
            className="pointer-events-none absolute top-0 flex items-baseline gap-1.5 whitespace-nowrap tabular-nums"
            style={{ left: `${(xMonth(hover!) / width) * 100}%`, transform: `translateX(-${(xMonth(hover!) / width) * 100}%)` }}>
            <span className="text-[15px] font-semibold">{amount(hovered.rate)}</span>
            <span className="text-[12px] text-muted">{axisLabel(hover!)}</span>
          </div>
        )}
      </div>
      <div data-testid="base-rate-time-axis" aria-hidden="true" className="relative h-4 text-[11px] tabular-nums text-muted sm:text-xs">
        {axisMonths.map((time, index) => (
          <span key={time} className="absolute whitespace-nowrap"
            style={{ left: `${(xMonth(time) / width) * 100}%`, transform: `translateX(${index === 0 ? 0 : index === axisMonths.length - 1 ? -100 : -50}%)` }}>
            {axisLabel(time)}
          </span>
        ))}
      </div>
    </figure>
  )
}
