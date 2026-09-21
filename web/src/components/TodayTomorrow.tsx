import { formatDayLabel, formatRate } from "../lib/format"
import { isStale } from "../lib/freshness"
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

  /* 미확정인 이유가 둘이고, 방문자에게 같은 말이어서는 안 된다. 평일 아침에
     오늘 고시가 아직 없는 것은 정상이고 몇 시간 뒤 채워지지만, 고시가 며칠째
     멈춘 것은 고장이다. 후자에 "아직"이라고 쓰면 곧 나온다는 뜻이 되어,
     사라진 신선도 배너가 하던 말이 거짓말로 대체된다.

     tomorrowRate 를 함께 보지 않는다 — isTomorrowConfirmed 가 이미 같은
     신선도 판정을 맨 앞에서 하므로, 낡았으면 tomorrowRate 는 반드시 null 이다.
     조건을 겹쳐 쓰면 없는 의존을 있는 것처럼 읽히게 만든다.

     고시일이 비어 있어도 낡음은 낡음이다. 날짜를 못 붙일 뿐이므로 날짜 없는
     문구로 내려간다. 여기서 "아직"으로 빠지면, CSV 가 깨져 날짜를 잃은 바로
     그때 가장 태연한 거짓말을 하게 된다. */
  const latestFixing = rates.at(-1)?.fixingDate
  const tomorrowNotice = !isStale(latestFixing, today)
    ? "아직 고시되지 않았습니다"
    : latestFixing
      ? `${formatDayLabel(latestFixing)} 이후 고시가 확인되지 않습니다`
      : "고시가 확인되지 않습니다"

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null

  return (
    <section className="px-6 pb-10 pt-14 text-center sm:pb-14 sm:pt-20">
      <div className="mx-auto flex max-w-page items-center justify-center gap-4 sm:gap-10">
        <div>
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {`오늘 · ${formatDayLabel(today)}`}
          </div>
          <div className="mt-2.5 font-display text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[44px] lg:text-[56px]">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        {/* 화살표는 오늘에서 내일로 간다는 표시일 뿐이라 한 색으로 두고,
            오르고 내린 것은 아래 숫자가 말한다. 값이 같은 날에도 칸은
            그대로 있어야 큰 숫자 둘이 맞붙지 않는다. */}
        {delta !== null && (
          <div className="flex shrink-0 flex-col items-center gap-2.5 pt-5">
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
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold tabular-nums sm:text-[17px] ${
                delta > 0
                  ? "bg-upTint text-up"
                  : delta < 0
                    ? "bg-downTint text-down"
                    : "bg-flatTint text-muted"
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
            <div className="mt-2.5 font-display text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[44px] lg:text-[56px]">
              {formatRate(tomorrowRate.rate)}
            </div>
          ) : (
            <div className="mt-4 text-[15px] text-muted sm:text-[17px]">
              {tomorrowNotice}
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
