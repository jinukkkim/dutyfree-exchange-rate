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
