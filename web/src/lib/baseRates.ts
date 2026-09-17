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
      // note 는 사람이 쓰는 자유 텍스트라 쉼표가 들어갈 수 있다. 앞의 다섯
      // 컬럼만 분해하고 나머지는 전부 note 로 되돌린다 — 그냥 split 하면
      // 쉼표 하나에 컬럼이 조용히 밀린다.
      // rates.csv 는 기계가 쓰고 값이 날짜·숫자·고정 문자열뿐이라 해당 없다.
      const fields = line.split(",")
      const [operator, effectiveDate, rate, status, sourceUrl] = fields
      const note = fields.slice(5).join(",")
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
