import { formatDayLabel, formatRate, type Lang } from "../lib/format"
import { isStale } from "../lib/freshness"
import InfoTip from "./InfoTip"
import {
  appliedOn,
  carriedUntilTomorrow,
  isTomorrowConfirmed,
  isTomorrowPending,
  nextDay,
  tomorrowValidThrough,
  type Rate,
} from "../lib/rates"

const APP_STORE_URL = "https://apps.apple.com/kr/app/id6829470220"

const BIG_NUMBER =
  "mt-2.5 text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[44px] lg:text-[56px]"

export default function TodayTomorrow({
  rates,
  today,
  lang = "ko",
}: {
  rates: Rate[]
  today: string
  lang?: Lang
}) {
  const en = lang === "en"
  const day = (iso: string) => formatDayLabel(iso, lang)
  // 영어 라벨이 숫자보다 넓으면 칸이 벌어지거나 줄바꿈되어 숫자 위치가 한국어판과
  // 달라진다. 숫자가 라벨보다 넓어지는 lg 미만에서는 요일을 접는다.
  const dayHeading = (name: string, iso: string) => {
    if (!en) return `${name} · ${day(iso)}`
    const [date, weekday] = day(iso).split(" (")
    return (
      <>
        {`${name} · ${date}`}
        <span className="hidden lg:inline">{` (${weekday}`}</span>
      </>
    )
  }
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
  const staleNotice = en
    ? latestFixing
      ? `No rate confirmed since ${day(latestFixing)}`
      : "No rate confirmed"
    : latestFixing
      ? `${day(latestFixing)} 이후 고시가 확인되지 않습니다`
      : "고시가 확인되지 않습니다"

  if (!todayRate) return null

  const delta = tomorrowRate ? tomorrowRate.rate - todayRate.rate : null
  const pending = isTomorrowPending(rates, today)

  // 토요일·연휴 앞은 끝나는 날을, 일요일·연휴 마지막 날은 어느 고시인지를 적는다.
  const validThrough = tomorrowValidThrough(rates, today)
  const carried = carriedUntilTomorrow(rates, today)
  const periodNote = validThrough
    ? en
      ? `Tomorrow's rate applies through ${day(validThrough)}`
      : `내일 환율은 ${day(validThrough)}까지 적용됩니다`
    : carried &&
      (en
        ? `The rate published on ${day(carried.fixingDate)} applies through tomorrow`
        : `내일까지 ${day(carried.fixingDate)} 고시 환율이 적용됩니다`)

  return (
    <section className="relative px-6 pt-14 text-center sm:pb-2 sm:pt-20">
      {/* 한국인에겐 자명한 숫자의 단위와 날짜 기준을 외국인에게만 밝힌다.
          위쪽 여백(pt-14·sm:pt-20) 안에 띄워서 숫자 위치가 한국어판과 같게 한다.
          여백을 바꾸면 높이(h-14·sm:h-20)도 같이 바꾼다. */}
      {en && (
        <p className="absolute inset-x-6 top-0 flex h-14 items-center justify-center text-[13px] leading-snug text-muted sm:h-20 sm:text-[14px]">
          <span>
            KRW per 1 USD · Korea time
            <span className="hidden sm:inline"> · </span>
            <br className="sm:hidden" />
            Same rate at Lotte, Shilla, Shinsegae and Hyundai
          </span>
        </p>
      )}

      {/* 대기 안내 줄은 흐름 밖이라 아래 링크와 겹치지 않게 자리를 따로 비운다. */}
      <div
        className={`mx-auto flex max-w-page items-center justify-center gap-4 sm:gap-10 ${
          pending ? "pb-7" : ""
        }`}
      >
        <div>
          <div className="text-[15px] tracking-[-0.01em] text-muted sm:text-[17px]">
            {dayHeading(en ? "Today" : "오늘", today)}
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
            {dayHeading(en ? "Tomorrow" : "내일", nextDay(today))}
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
               비어 있는 것으로 읽힌다. 고시 시각은 본문 대신 ⓘ 가 말한다. */
            <>
              <div className={`${BIG_NUMBER} text-muted`}>{en ? "Pending" : "고시 전"}</div>
              {/* 흐름에서 빼야 칸 높이가 오늘 칸과 같아져 두 제목이 나란히 선다. */}
              <div className="absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap text-[13px] text-muted sm:text-[14px]">
                {en ? "Not published yet" : "오늘 고시 후 공개됩니다"}
                <InfoTip label={en ? "About the publication time" : "고시 시각 안내"}>
                  {en
                    ? "The official rate is published at 8:00 a.m. Korea time on business days. It usually appears earlier, so this site is typically updated before dawn."
                    : "매매기준율의 공식 고시 시각은 영업일 오전 8시이지만, 대부분 그보다 일찍 공개되어 이 사이트에는 보통 새벽 중에 반영됩니다."}
                </InfoTip>
              </div>
            </>
          )}
        </div>
      </div>

      {periodNote && (
        <p className="mt-4 text-[13px] text-muted sm:text-[14px]">
          {periodNote}
          <InfoTip label={en ? "About weekends and holidays" : "주말·공휴일 환율 안내"}>
            {en
              ? "No new rate is published on weekends and holidays, so the last published rate stays in effect until the next one."
              : "주말과 공휴일에는 환율이 새로 고시되지 않아, 직전 영업일에 고시된 환율이 다음 고시일까지 그대로 적용됩니다."}
          </InfoTip>
        </p>
      )}

      <p className="mt-7 text-[17px]">
        <a href={en ? "/en/guide" : "/guide"} className="text-link hover:underline">
          {en ? "How this rate is set ›" : "환율이 정해지는 방식 알아보기 ›"}
        </a>
      </p>

      {/* 만든 사람의 다른 앱. iPhone 전용이라 받을 수 있는 기기에서만 띄운다 —
          안드로이드·PC 방문자에게는 첫 화면이 그대로다. 위 링크보다 한 단계
          약한 회색이라 사이트 본래 링크보다 튀지 않는다.
          ponytail: iPadOS 는 Mac 처럼 자신을 밝혀 빠진다. 태블릿 유입이 0.5% 미만이라 둔다. */}
      {!en && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
        <p className="mt-3 text-[15px]">
          <a
            href={APP_STORE_URL}
            className="inline-flex items-center gap-1.5 text-sub hover:underline"
          >
            <img src="/ochenyen-icon.png" alt="" className="h-[18px] w-[18px] rounded-[4px]" />
            일본 면세 환급은 오천엔 앱으로 챙기세요 ›
          </a>
        </p>
      )}
    </section>
  )
}
