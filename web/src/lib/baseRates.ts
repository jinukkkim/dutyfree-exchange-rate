export type BaseRateSource = { name: string; url: string }
export type BaseRateChange = {
  period: string
  previousRate: number | null
  rate: number
  applications: {
    effectiveDate: string
    operators: string[]
    status: "confirmed" | "unconfirmed"
  }[]
  sources: BaseRateSource[]
  notes: string[]
}

export function parseBaseRateChanges(csv: string): BaseRateChange[] {
  const rows = csv.trim().split("\n").slice(1)
    .filter((line) => line.trim())
    .map((line) => line.trim().split(","))
  const changes = new Map<string, BaseRateChange>()

  for (const [operator, effectiveDate, rawPrevious, rawRate, status, sourceNames, sourceUrls, note = ""] of rows) {
    const rate = Number(rawRate)
    if (!Number.isFinite(rate) || rate <= 0) continue
    if (status !== "confirmed" && status !== "unconfirmed") continue
    // 이력에 빈 구간이 있으므로 변경 전 값도 기사에서 확인한 값을 쓴다.
    const parsedPrevious = Number(rawPrevious)
    const previousRate = Number.isFinite(parsedPrevious) && parsedPrevious > 0 ? parsedPrevious : null
    const period = effectiveDate.slice(0, 7)
    const key = JSON.stringify([period, previousRate, rate])
    let change = changes.get(key)
    if (!change) {
      change = { period, previousRate, rate, applications: [], sources: [], notes: [] }
      changes.set(key, change)
    }
    const application = change.applications.find((item) => item.effectiveDate === effectiveDate && item.status === status)
    if (application) application.operators.push(operator)
    else change.applications.push({ effectiveDate, operators: [operator], status })
    if (note && !change.notes.includes(note)) change.notes.push(note)

    const names = sourceNames.split("|")
    for (const [index, url] of sourceUrls.split("|").entries()) {
      if (!/^https?:\/\//.test(url) || change.sources.some((source) => source.url === url) || change.sources.length === 3) continue
      change.sources.push({ name: names[index] || "기사", url })
    }
  }

  return [...changes.values()].sort((a, b) => b.period.localeCompare(a.period))
}
