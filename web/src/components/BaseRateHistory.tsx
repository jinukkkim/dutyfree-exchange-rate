import { useEffect, useId, useRef, useState } from "react"

import excerptData from "../../../data/base_rate_excerpts.json"
import baseRatesCsv from "../../../data/base_rates.csv?raw"
import meta from "../../../data/meta.json"

import { parseBaseRateChanges, type BaseRateSource } from "../lib/baseRates"

const changes = parseBaseRateChanges(baseRatesCsv)
const excerpts: Record<string, { publishedAt: string; excerpts: Record<string, string[]> }> = excerptData
const OPERATORS: Record<string, string> = {
  lotte: "롯데", shilla: "신라", shinsegae: "신세계", hyundai: "현대", industry: "업계",
}
const formatRate = (rate: number) => rate.toLocaleString("ko-KR")
const formatDate = (date: string) => date.replaceAll("-", ".")
const TITLE = "면세점 기준환율(국산품용) 변경 이력"

export default function BaseRateHistory() {
  const [selected, setSelected] = useState<{ period: string; source: BaseRateSource } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const article = selected && excerpts[selected.source.url]
  const quotes = selected && article?.excerpts[selected.period]

  useEffect(() => {
    const box = dialog.current
    if (!box) return
    if (selected && !box.open) box.showModal()
    else if (!selected && box.open) box.close()
  }, [selected])

  return (
    <details className="mt-4 border-t border-rule pt-4 text-ink">
      <summary className="cursor-pointer text-[15px] text-link marker:text-muted">변경 이력 자세히 보기</summary>
      <section className="mt-5">
      <h3 className="text-base font-semibold text-slate-900">{TITLE}</h3>
      <p className="mt-2 text-sm text-slate-600">
        기사로 확인한 변경 이력입니다. 마지막 기록이 현재 적용값을 보장하지 않습니다.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        마지막 확인 {formatDate(meta.base_rates_verified_at)} · 수동으로 기록합니다.
      </p>

      <table className="mt-4 w-full table-fixed text-left text-[13px] leading-relaxed sm:text-sm">
        <caption className="sr-only">{TITLE}</caption>
        <thead className="border-b border-slate-300 text-slate-600">
          <tr>
            <th scope="col" className="w-[116px] pb-2 pr-2 font-medium sm:w-44">변경 (원/달러)</th>
            <th scope="col" className="pb-2 pr-2 font-medium">면세점 · 적용일</th>
            <th scope="col" className="w-[76px] pb-2 text-right font-medium sm:w-24">출처</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={`${change.period}-${change.previousRate}-${change.rate}`} className="border-b border-slate-200 align-top">
              <th scope="row" className="py-4 pr-2 font-normal">
                <span className="block whitespace-nowrap text-[15px] font-semibold tabular-nums text-slate-900 sm:text-base">
                  {change.previousRate !== null && `${formatRate(change.previousRate)} → `}
                  {formatRate(change.rate)}
                </span>
                <time dateTime={change.period} className="mt-1 block text-slate-600">{formatDate(change.period)}</time>
              </th>
              <td className="space-y-2 py-4 pr-2">
                {change.applications.map((application) => (
                  <div key={`${application.effectiveDate}-${application.status}`}>
                    <span>{application.operators.map((operator) => OPERATORS[operator] ?? operator).join("·")}</span>
                    {application.status === "confirmed" ? (
                      <time dateTime={application.effectiveDate} className="block tabular-nums text-slate-600 sm:ml-2 sm:inline">
                        {application.effectiveDate.slice(5).split("-").map(Number).join("/")}
                      </time>
                    ) : <span className="block text-slate-600 sm:ml-2 sm:inline">일자 미상</span>}
                  </div>
                ))}
                {change.notes.map((note) => <p key={note} className="text-xs text-slate-600">{note}</p>)}
              </td>
              <td className="py-3 text-right">
                {change.sources.map((source) => (
                  <button key={source.url} type="button" aria-haspopup="dialog"
                    aria-label={`${formatDate(change.period)} ${source.name} 출처`}
                    onClick={() => setSelected({ period: change.period, source })}
                    className="block w-full py-1 text-right underline underline-offset-2 hover:text-slate-900">
                    {source.name}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dialog ref={dialog} aria-labelledby={titleId}
        onCancel={() => setSelected(null)} onClose={() => setSelected(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setSelected(null) }}
        className="m-auto max-h-[80vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-700 shadow-xl backdrop:bg-black/30">
        {selected && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 id={titleId} className="text-lg font-semibold text-slate-900">{selected.source.name} 기사 발췌</h4>
                <p className="mt-1 text-sm text-slate-600">{formatDate(selected.period)} 변경 근거</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded px-2 py-1 text-sm underline underline-offset-2">닫기</button>
            </div>
            {article && <p className="mt-4 text-xs text-slate-600">기사 발행일 <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time></p>}
            {quotes?.length ? (
              <div className="mt-3 space-y-3">
                {quotes.map((quote) => <blockquote key={quote} cite={selected.source.url} className="border-l-2 border-slate-300 pl-3 text-sm leading-relaxed">{quote}</blockquote>)}
              </div>
            ) : <p className="mt-3 text-sm">이 출처의 발췌문은 아직 등록되지 않았습니다.</p>}
            <a href={selected.source.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm text-link underline underline-offset-2">기사 원문 보기</a>
          </div>
        )}
      </dialog>
      </section>
    </details>
  )
}
