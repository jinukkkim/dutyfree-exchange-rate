/** 보세판매장 고시 §3④2 에 따라 환율은 소수점 2자리로 표시한다. */
export function formatRate(rate: number): string {
  const [whole, fraction] = rate.toFixed(2).split(".")
  return `${Number(whole).toLocaleString("ko-KR")}.${fraction}`
}

/**
 * 차액을 문장에 넣을 때 쓰는 표기. "8.00원 비쌉니다" 는 읽히지 않으므로
 * 의미 없는 0 을 떨군다. 8.00 → 8, 1.10 → 1.1.
 */
export function formatAmount(rate: number): string {
  return Number(rate.toFixed(2)).toLocaleString("ko-KR")
}

/**
 * "9월 15일". 날짜 문자열은 이미 KST 기준이므로 UTC 로 읽어야 방문자
 * 타임존에 따라 하루가 밀리지 않는다.
 */
export function formatMonthDay(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`))
}
