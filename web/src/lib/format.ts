/** 보세판매장 고시 §3④2 에 따라 환율은 소수점 2자리로 표시한다. */
export function formatRate(rate: number): string {
  const [whole, fraction] = rate.toFixed(2).split(".")
  return `${Number(whole).toLocaleString("ko-KR")}.${fraction}`
}
