export type Lang = "ko" | "en" | "ja"

/** 언어별 문구 고르기. 인자 순서는 늘 한국어, 영어, 일본어다. */
export const pick =
  (lang: Lang) =>
  <T,>(ko: T, en: T, ja: T): T =>
    ({ ko, en, ja })[lang]

/** 보세판매장 고시 §3④2 에 따라 환율은 소수점 2자리로 표시한다. */
export function formatRate(rate: number): string {
  const [whole, fraction] = rate.toFixed(2).split(".")
  return `${Number(whole).toLocaleString("ko-KR")}.${fraction}`
}

/**
 * "9/20(일)". 날짜 문자열은 이미 KST 기준이므로 UTC 로 읽어야 방문자
 * 타임존에 따라 하루가 밀리지 않는다.
 *
 * 적용일에는 요일이 붙어야 한다 — 주말·공휴일에 직전 고시가
 * 이월된다는 것이 이 사이트의 기본 규칙이라, 요일이 곧 설명이다.
 */
export function formatDayLabel(iso: string, lang: Lang = "ko"): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (lang === "en") {
    const part = (options: Intl.DateTimeFormatOptions) =>
      date.toLocaleDateString("en-US", { timeZone: "UTC", ...options })
    return `${part({ month: "short", day: "numeric" })} (${part({ weekday: "short" })})`
  }
  // 일본어도 한국어처럼 "11/10(火)" 로 쓴다. 일본 쪽에서도 흔한 짧은 꼴이다.
  const weekdays = lang === "ja" ? "日月火水木金土" : "일월화수목금토"
  const weekday = weekdays[date.getUTCDay()]
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${weekday})`
}
