export type BaseRate = {
  operator: string
  effectiveDate: string
  rate: number | null
  status: "confirmed" | "unconfirmed"
  sourceUrl: string
  note: string
}

export const OPERATOR_LABELS: Record<string, string> = {
  lotte: "롯데",
  shilla: "신라",
  shinsegae: "신세계",
  hyundai: "현대",
}

export function parseBaseRates(csv: string): BaseRate[] {
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [operator, effectiveDate, rate, status, sourceUrl, note = ""] =
        line.split(",")
      return {
        operator,
        effectiveDate,
        // 미확정은 빈 값으로 둔다. 추정치를 확정인 척 넣으면 기록이 오염된다.
        rate: rate.trim() === "" ? null : Number(rate),
        status: status as BaseRate["status"],
        sourceUrl,
        note,
      }
    })
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
}
