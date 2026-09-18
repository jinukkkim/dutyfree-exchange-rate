import { formatRate } from "../lib/format"
import { appliedOn, isTomorrowConfirmed, nextDay, type Rate } from "../lib/rates"

export default function TodayTomorrow({
  rates,
  today,
}: {
  rates: Rate[]
  today: string
}) {
  const todayRate = appliedOn(rates, today)
  const tomorrowRate = isTomorrowConfirmed(rates, today)
    ? appliedOn(rates, nextDay(today))
    : null

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null

  // 값이 같은 이유가 둘이다: 주말·공휴일 이월(같은 고시가 이틀을 덮는다)과
  // 새 고시가 우연히 같은 값인 경우. 앞쪽은 이유를 말해줄 수 있다.
  const carriedOver = tomorrowRate?.fixingDate === todayRate.fixingDate

  return (
    <section className="px-4 pb-10 pt-12">
      <h1 className="text-center text-4xl font-bold tracking-tight">
        면세점 적용환율
      </h1>

      <div className="mt-8 flex items-start justify-center gap-12">
        <div className="text-center">
          <div className="text-sm font-medium text-slate-500">오늘</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-slate-500">내일</div>
          {tomorrowRate ? (
            <>
              <div className="mt-1 text-4xl font-bold tabular-nums">
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
            <div className="mt-3 text-sm text-slate-400">
              아직 고시되지 않았습니다
            </div>
          )}
        </div>
      </div>

      {delta !== null && (
        <p className="mt-8 text-center text-lg text-slate-700">
          {delta === 0
            ? "내일도 오늘과 같습니다."
            : `내일은 오늘보다 ${delta > 0 ? "비쌉니다" : "쌉니다"}.`}
          {delta === 0 && carriedOver && (
            <span className="mt-1 block text-sm text-slate-500">
              주말·공휴일에는 새 고시가 없어 직전 고시가 그대로 이어집니다.
            </span>
          )}
        </p>
      )}

      <p className="mt-4 text-center text-sm">
        <a href="#/guide" className="text-slate-500 underline underline-offset-2">
          면세점 환율은 어떻게 정해지나요?
        </a>
      </p>
    </section>
  )
}
