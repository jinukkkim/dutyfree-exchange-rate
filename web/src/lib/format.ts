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
export function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${weekday})`
}
