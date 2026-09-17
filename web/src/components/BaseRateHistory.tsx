import { OPERATOR_LABELS, type BaseRate } from "../lib/baseRates"

export default function BaseRateHistory({
  history,
  verifiedAt,
}: {
  history: BaseRate[]
  verifiedAt: string
}) {
  return (
    <section className="px-4 py-8">
      <h2 className="text-base font-medium text-slate-700">
        면세점 기준환율(국산품용) 변경 이력
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        국산 브랜드의 달러 표시가를 정할 때 쓰는 면세점 자체 환율입니다. 위의
        적용환율과는 다른 값이며, 수입 브랜드에는 적용되지 않습니다.
      </p>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">아직 기록된 변경이 없습니다.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-1">적용일</th>
              <th className="py-1">면세점</th>
              <th className="py-1 text-right">기준환율</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={`${row.operator}-${row.effectiveDate}`} className="border-b">
                <td className="py-1 tabular-nums">{row.effectiveDate}</td>
                <td className="py-1">
                  {OPERATOR_LABELS[row.operator] ?? row.operator}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {row.rate === null ? (
                    <span className="text-slate-400">미확정</span>
                  ) : (
                    row.rate.toLocaleString("ko-KR")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-slate-400">
        마지막 확인 {verifiedAt} · 자동 수집이 아니라 사람이 기록합니다.
      </p>
    </section>
  )
}
