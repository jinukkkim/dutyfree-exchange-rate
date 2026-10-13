import { formatDayLabel, formatRate } from "../lib/format"
import { isStale } from "../lib/freshness"
import {
  appliedOn,
  isTomorrowConfirmed,
  isTomorrowPending,
  nextDay,
  tomorrowValidThrough,
  type Rate,
} from "../lib/rates"

const BIG_NUMBER =
  "mt-2.5 font-display text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[44px] lg:text-[56px]"

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
     멈춘 것은 고장이다. 후자에 "고시 전"이라고 쓰면 곧 나온다는 뜻이 되어,
     사라진 신선도 배너가 하던 말이 거짓말로 대체된다.

     tomorrowRate 를 함께 보지 않는다 — isTomorrowConfirmed 가 이미 같은
     신선도 판정을 맨 앞에서 하므로, 낡았으면 tomorrowRate 는 반드시 null 이다.
     조건을 겹쳐 쓰면 없는 의존을 있는 것처럼 읽히게 만든다.

     고시일이 비어 있어도 낡음은 낡음이다. 날짜를 못 붙일 뿐이므로 날짜 없는
     문구로 내려간다. 여기서 "고시 전"으로 빠지면, CSV 가 깨져 날짜를 잃은 바로
     그때 가장 태연한 거짓말을 하게 된다. */
  const latestFixing = rates.at(-1)?.fixingDate
  const stale = isStale(latestFixing, today)
  const staleNotice = latestFixing
    ? `${formatDayLabel(latestFixing)} 이후 고시가 확인되지 않습니다`
    : "고시가 확인되지 않습니다"

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null
  const pending = isTomorrowPending(rates, today)

  const validThrough = tomorrowValidThrough(rates, today)

  return (
    <section className="px-6 pt-14 text-center sm:pb-2 sm:pt-20">
      {/* 대기 안내 줄은 흐름 밖이라 아래 링크와 겹치지 않게 자리를 따로 비운다. */}
      <div
        className={`mx-auto flex max-w-page items-center justify-center gap-4 sm:gap-10 ${
          pending ? "pb-7" : ""
        }`}
      >
        <div>
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {`오늘 · ${formatDayLabel(today)}`}
          </div>
          <div className={BIG_NUMBER}>
            {formatRate(todayRate.rate)}
          </div>
        </div>

        {/* 화살표는 오늘에서 내일로 간다는 표시일 뿐이라 한 색으로 두고,
            오르고 내린 것은 아래 숫자가 말한다. 값이 같은 날에도 칸은
            그대로 있어야 큰 숫자 둘이 맞붙지 않는다.

            고시 전에는 등락 칸이 없어 화살표만 남는다. 확정일 때 자리에 두면
            빈 칸 위에 뜬 것처럼 보여서, 큰 숫자의 세로 중앙으로 내려 숫자에서
            숫자를 가리키게 한다. 아래 여백은 (숫자 글자 크기 - 화살표 12px) / 2
            이고, 글자 크기가 바뀌면 같이 바꿔야 한다. */}
        {(delta !== null || pending) && (
          <div
            className={`flex shrink-0 flex-col items-center gap-2.5 ${
              delta === null ? "mb-[9px] self-end sm:mb-4 lg:mb-[22px]" : "pt-5"
            }`}
          >
            <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true">
              <path
                d="M0 6 H25 M20 1.5 L27 6 L20 10.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-muted"
              />
            </svg>
            {delta !== null && (
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
            )}
          </div>
        )}

        <div className="relative">
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {`내일 · ${formatDayLabel(nextDay(today))}`}
          </div>
          {tomorrowRate ? (
            <div className={BIG_NUMBER}>
              {formatRate(tomorrowRate.rate)}
            </div>
          ) : stale ? (
            <div className="mt-4 text-[15px] text-muted sm:text-[17px]">
              {staleNotice}
            </div>
          ) : (
            /* 정상 대기다. 숫자 자리를 같은 크기로 채워야 칸이 깨진 게 아니라
               비어 있는 것으로 읽힌다. 고시 시각은 본문 대신 각주가 말한다. */
            <>
              <div className={`${BIG_NUMBER} text-muted`}>고시 전</div>
              {/* 흐름에서 빼야 칸 높이가 오늘 칸과 같아져 두 제목이 나란히 선다. */}
              <div className="absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap text-[13px] text-muted sm:text-[14px]">
                오늘 고시 후 공개됩니다
                <sup className="ml-0.5 text-[0.65em]">
                  <a href="#footnote-pending" aria-label="각주 1" className="hover:underline">
                    1
                  </a>
                </sup>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 각주 본문은 푸터에 있다(App 이 같은 판정으로 붙인다). */}
      {validThrough && (
        <p className="mt-4 text-[13px] text-muted sm:text-[14px]">
          {`내일 환율은 ${formatDayLabel(validThrough)}까지 적용됩니다`}
          <sup className="ml-0.5 text-[0.65em]">
            <a href="#footnote-1" aria-label="각주 1" className="hover:underline">
              1
            </a>
          </sup>
        </p>
      )}

      <p className="mt-7 text-[17px]">
        <a href="/guide" className="text-link hover:underline">
          환율이 정해지는 방식 알아보기 ›
        </a>
      </p>
    </section>
  )
}
