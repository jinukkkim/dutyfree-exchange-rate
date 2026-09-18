export type Rate = {
  fixingDate: string // YYYY-MM-DD, 고시일 (적용일이 아니다)
  rate: number
  method: "MAR" | "TWAP"
  source: string
  collectedAt: string
}

export function parseRates(csv: string): Rate[] {
  const lines = csv.trim().split("\n")
  const rows = lines.slice(1).filter((line) => line.trim() !== "")

  return rows
    .map((line) => {
      const [fixingDate, rate, method, source, collectedAt] = line.split(",")
      return {
        fixingDate,
        rate: Number(rate),
        method: method as Rate["method"],
        source,
        collectedAt,
      }
    })
    .sort((a, b) => a.fixingDate.localeCompare(b.fixingDate))
}

/**
 * targetISO 일에 적용되는 환율.
 *
 * 고시일 D 의 값은 D+1 부터 다음 고시일까지 적용되므로, target 보다 **앞선**
 * 고시일 중 가장 늦은 것이 답이다. 주말·공휴일 이월이 여기서 저절로 처리되며,
 * 그래서 공휴일 달력이 필요 없다. 수집기의 dfx/fixing.py 와 같은 규칙이다.
 */
export function appliedOn(rates: Rate[], targetISO: string): Rate | null {
  let found: Rate | null = null
  for (const rate of rates) {
    if (rate.fixingDate < targetISO) found = rate
    else break
  }
  return found
}

/** ISO 날짜 하루 뒤. 고시일 → 적용일 변환에 쓴다 (고시 D 는 D+1 에 적용). */
export function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * 내일 적용환율을 확정할 수 있는가.
 *
 * 내일 적용되는 것은 **오늘 고시**다. 그래서 오늘 고시가 데이터에 없으면
 * 확정할 수 없다. appliedOn(rates, 내일) 을 그대로 쓰면 주말 이월 규칙이
 * 직전 고시를 돌려주므로, 아직 안 나온 값을 확정인 것처럼 보여주게 된다.
 *
 * 주말은 예외다. 애초에 고시가 없는 날이므로 직전 고시가 이어지는 것이
 * 확정이고, 여기서 "미고시"를 띄우면 토·일마다 틀린 안내가 나간다.
 * 공휴일은 주말과 구분하지 못한다 — 그 경우 값은 맞고 문구만 보수적이며,
 * 왜 최신 고시가 없는지는 신선도 배너가 설명한다.
 */
export function isTomorrowConfirmed(rates: Rate[], today: string): boolean {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const isBusinessDay = weekday >= 1 && weekday <= 5
  if (!isBusinessDay) return true
  return rates.some((rate) => rate.fixingDate === today)
}
