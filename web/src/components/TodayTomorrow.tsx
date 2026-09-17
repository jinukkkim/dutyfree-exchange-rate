import { useState } from "react"

import { formatKrw, formatRate } from "../lib/format"
import { appliedOn, type Rate } from "../lib/rates"

const DEFAULT_BASIS = 300

function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * 내일 적용환율을 확정할 수 있는가.
 *
 * 내일 적용되는 것은 **오늘 고시**다. 그래서 오늘 고시가 데이터에 없으면
 * 확정할 수 없다. appliedOn(rates, 내일) 을 그대로 쓰면 주말 이월 규칙이
 * 직전 고시를 돌려주므로, 아직 안 나온 값을 확정인 것처럼 보여주게 된다.
 *
 * 주말은 예외다. 애초에 고시가 없는 날이므로 직전 고시가 이어지는 것이
 * 확정이고, 여기서 "미고시"를 띄우면 토·일마다 틀린 안내가 나간다.
 * 공휴일은 주말과 구분하지 못한다 — 그 경우 값은 맞고 문구만 보수적이며,
 * 왜 최신 고시가 없는지는 신선도 배너가 설명한다.
 */
function isTomorrowConfirmed(rates: Rate[], today: string): boolean {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const isBusinessDay = weekday >= 1 && weekday <= 5
  if (!isBusinessDay) return true
  return rates.some((rate) => rate.fixingDate === today)
}

export default function TodayTomorrow({
  rates,
  today,
}: {
  rates: Rate[]
  today: string
}) {
  const [basis, setBasis] = useState(DEFAULT_BASIS)

  const todayRate = appliedOn(rates, today)
  const tomorrowRate = isTomorrowConfirmed(rates, today)
    ? appliedOn(rates, nextDay(today))
    : null

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null

  return (
    <section className="px-4 py-10">
      <h1 className="text-center text-base font-medium text-slate-500">
        면세점 적용환율
      </h1>

      <div className="mx-auto mt-6 flex max-w-md justify-center gap-10">
        <div className="text-center">
          <div className="text-sm text-slate-500">오늘</div>
          <div className="text-3xl font-semibold tabular-nums">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-slate-500">내일</div>
          {tomorrowRate ? (
            <>
              <div className="text-3xl font-semibold tabular-nums">
                {formatRate(tomorrowRate.rate)}
              </div>
              {delta !== null && delta !== 0 && (
                <div
                  className={
                    delta > 0
                      ? "mt-1 text-sm text-rose-600 tabular-nums"
                      : "mt-1 text-sm text-blue-600 tabular-nums"
                  }
                >
                  {delta > 0 ? "▲" : "▼"} {formatRate(Math.abs(delta))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 text-sm text-slate-400">
              아직 고시되지 않았습니다
            </div>
          )}
        </div>
      </div>

      {delta !== null && delta !== 0 && (
        <p className="mt-6 text-center text-slate-700">
          내일은 오늘보다 {delta > 0 ? "비쌉니다" : "쌉니다"}.{" "}
          <label>
            $
            <input
              type="number"
              value={basis}
              min={1}
              onChange={(event) => setBasis(Number(event.target.value) || 1)}
              className="w-20 rounded border border-slate-300 px-1 text-center tabular-nums"
              aria-label="기준 금액(달러)"
            />{" "}
            기준 약 {formatKrw(Math.abs(delta) * basis)}{" "}
            {delta > 0 ? "더" : "덜"}.
          </label>
        </p>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        ※ 내일 값은 예측이 아니라 오늘 08:00 에 고시된 매매기준율입니다.
      </p>
    </section>
  )
}
