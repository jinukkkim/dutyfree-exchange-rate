const FORM_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체

export default function Glossary() {
  return (
    <section className="px-4 py-8 text-sm leading-relaxed text-slate-600">
      <h2 className="text-base font-medium text-slate-700">두 가지 환율</h2>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="font-medium text-slate-800">적용환율</dt>
          <dd>
            달러 표시가를 원화로 환산할 때 쓰는 환율입니다. 직전 영업일에 고시된
            매매기준율이 그대로 적용되며, 매일 바뀝니다.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-800">
            면세점 기준환율(국산품용)
          </dt>
          <dd>
            국산 브랜드의 원화 공급가를 달러 표시가로 바꿀 때 면세점이 쓰는 자체
            환율입니다. 1년에 서너 번 바뀌고, 수입 브랜드에는 적용되지 않습니다.
          </dd>
        </div>
      </dl>

      <p className="mt-4">
        오늘 뉴스에 나온 환율은 <strong>내일</strong> 적용환율입니다. 오늘 면세점에
        적용되는 값은 그 전날 고시된 것이라, 뉴스의 등락 방향과 반대인 날이 절반에
        가깝습니다.
      </p>

      <p className="mt-4 text-xs text-slate-400">
        출처: 서울외국환중개 매매기준율 · 보세판매장 운영에 관한 고시 제3조제4항
        <br />
        기준환율 변경을 발견하셨다면{" "}
        <a href={FORM_URL} className="underline" rel="noreferrer">
          제보해 주세요
        </a>
        .
      </p>
    </section>
  )
}
