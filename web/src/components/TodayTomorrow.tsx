import { formatDayLabel, formatRate } from "../lib/format"
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

  return (
    <section className="px-6 pb-20 pt-14 text-center sm:pb-24 sm:pt-[88px]">
      <div className="mx-auto flex max-w-page items-center justify-center gap-4 sm:gap-14">
        <div>
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {`오늘 · ${formatDayLabel(today)}`}
          </div>
          <div className="mt-2.5 font-display text-[34px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[52px] lg:text-[76px]">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        {/* 화살표는 오늘에서 내일로 간다는 표시일 뿐이라 한 색으로 두고,
            오르고 내린 것은 아래 숫자가 말한다. 값이 같은 날에도 칸은
            그대로 있어야 큰 숫자 둘이 맞붙지 않는다. */}
        {delta !== null && (
          <div className="flex shrink-0 flex-col items-center gap-2 pt-6">
            <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true">
              <path
                d="M0 6 H25 M20 1.5 L27 6 L20 10.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-muted"
              />
            </svg>
            <div
              className={`text-[15px] font-semibold tabular-nums sm:text-[19px] ${
                delta > 0 ? "text-up" : delta < 0 ? "text-down" : "text-muted"
              }`}
            >
              {`${delta > 0 ? "▲ " : delta < 0 ? "▼ " : ""}${formatRate(
                Math.abs(delta),
              )}`}
            </div>
          </div>
        )}

        <div>
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {`내일 · ${formatDayLabel(nextDay(today))}`}
          </div>
          {tomorrowRate ? (
            <div className="mt-2.5 font-display text-[34px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[52px] lg:text-[76px]">
              {formatRate(tomorrowRate.rate)}
            </div>
          ) : (
            <div className="mt-4 text-[15px] text-muted sm:text-[17px]">
              아직 고시되지 않았습니다
            </div>
          )}
        </div>
      </div>

      <p className="mt-7 text-[17px]">
        <a href="#/guide" className="text-link hover:underline">
          환율이 정해지는 방식 알아보기 ›
        </a>
      </p>
    </section>
  )
}
