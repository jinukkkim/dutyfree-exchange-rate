import { formatAmount, formatDayLabel, formatRate } from "../lib/format"
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
    <section className="px-4 pt-10">
      {/* 오늘과 내일은 같은 크기다. 둘 중 하나를 키우면 비교가 아니라
          발표가 된다 — 방문자가 알고 싶은 건 두 값의 차이다. */}
      <div className="flex items-start gap-4 sm:gap-[34px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">오늘</span>
            <span className="text-[13px] text-muted">{formatDayLabel(today)}</span>
          </div>
          <div className="font-num text-[32px] font-semibold leading-[0.92] tracking-[-0.03em] tabular-nums sm:text-[58px]">
            {formatRate(todayRate.rate)}
          </div>
        </div>

        {/* 차액 칸은 늘 자리를 지킨다. 값이 같은 날 칸이 통째로 사라지면
            58px 숫자 둘이 맞붙어 한 덩어리로 읽힌다. 화살표는 오늘에서
            내일로 간다는 표시일 뿐이라 등락과 무관하게 한 색이고, 오르고
            내린 것은 아래 숫자가 말한다. */}
        {delta !== null && (
          <div className="flex shrink-0 flex-col items-center gap-1 pt-[18px] sm:pt-[34px]">
            <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
              <path
                d="M0 5 H18 M14 1 L20 5 L14 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="text-navy"
              />
            </svg>
            <div
              className={`font-num text-[15px] font-semibold tabular-nums sm:text-[17px] ${
                delta > 0 ? "text-up" : delta < 0 ? "text-down" : "text-muted"
              }`}
            >
              {delta > 0 ? "▲ " : delta < 0 ? "▼ " : ""}
              {formatRate(Math.abs(delta))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">내일</span>
            <span className="text-[13px] text-muted">
              {formatDayLabel(nextDay(today))}
            </span>
          </div>
          {tomorrowRate ? (
            <>
              <div className="font-num text-[32px] font-semibold leading-[0.92] tracking-[-0.03em] tabular-nums sm:text-[58px]">
                {formatRate(tomorrowRate.rate)}
              </div>
            </>
          ) : (
            <div className="pt-2 text-sm text-muted">
              아직 고시되지 않았습니다
            </div>
          )}
        </div>
      </div>

      {delta !== null && (
        <p className="mt-6 text-[19px] sm:text-[22px]">
          {delta === 0
            ? "내일도 오늘과 같습니다."
            : `내일은 오늘보다 ${formatAmount(Math.abs(delta))}원 ${
                delta > 0 ? "비쌉니다" : "쌉니다"
              }.`}
          {delta === 0 && carriedOver && (
            <span className="mt-1 block text-[13px] text-muted">
              주말·공휴일에는 새 고시가 없어 직전 고시가 그대로 이어집니다.
            </span>
          )}
        </p>
      )}

      <p className="mt-5 text-[13px]">
        <a
          href="#/guide"
          className="text-sub underline underline-offset-[3px]"
        >
          면세점 환율은 어떻게 정해지나요?
        </a>
      </p>
    </section>
  )
}
