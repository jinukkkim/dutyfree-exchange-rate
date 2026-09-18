/**
 * 환율 정보 페이지.
 *
 * 내용의 근거는 전부 docs/domain-reference.md 에 있다. 숫자·법조문을 고칠 때는
 * 그쪽을 먼저 고치고 여기를 맞춘다.
 */
export default function RateGuide() {
  return (
    <article className="px-4 pb-16 pt-10 text-slate-700">
      <p className="text-sm">
        <a href="#/" className="text-slate-500 underline underline-offset-2">
          ← 오늘·내일 환율로 돌아가기
        </a>
      </p>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
        면세점 환율, 어떤 환율이 쓰이나요?
      </h1>
      <p className="mt-4 leading-relaxed">
        면세점에서 본 달러 가격에 곱해지는 환율은 은행 앱에 뜨는 그 환율이
        아닙니다. 이름이 비슷한 환율이 여럿이고, 그중 면세점에 쓰이는 건
        딱 하나입니다.
      </p>

      <Section title="환율에도 종류가 있습니다">
        <p>
          같은 &lsquo;환율&rsquo;이라는 말이 서로 다른 값을 가리킵니다. 자주
          헷갈리는 네 가지를 먼저 갈라 두겠습니다.
        </p>
        <Terms
          items={[
            [
              "매매기준율",
              "서울외국환중개가 영업일마다 오전 8시에 한 번 고시하는 원/달러 기준값입니다. 직전 영업일에 실제로 체결된 은행 간 거래를 거래량으로 가중평균해 냅니다. 한 번 고시되면 그날 안에는 바뀌지 않습니다.",
            ],
            [
              "은행 고시환율",
              "은행이 창구에 내거는 환율표입니다. 매매기준율에 은행 스프레드(살 때·팔 때 차이)를 붙인 값이고, 하루에도 여러 회차로 바뀝니다. 앱에서 보는 ‘매매기준율’도 1회차 이후에는 은행이 장중 시세를 반영해 움직인 값이라, 그날 고시된 매매기준율과 다를 수 있습니다.",
            ],
            [
              "면세점 적용환율",
              "면세점이 달러 표시가를 원화로 환산할 때 쓰는 환율입니다. 아래에서 자세히 다룹니다. 면세점에서 실제로 결제 금액을 만드는 건 이 환율 하나입니다.",
            ],
            [
              "면세점 기준환율",
              "국산 브랜드의 원화 공급가를 달러 진열가로 바꿀 때 면세점이 쓰는 자체 값입니다. 1년에 서너 번만 바뀌고, 법령 근거 없이 면세점이 스스로 정합니다. 이름이 비슷하지만 적용환율과는 전혀 다른 값입니다.",
            ],
          ]}
        />
        <Note>
          관세청이 주 단위로 고시하는 <strong>과세환율</strong>도 있지만, 이건
          수입 물품의 과세가격을 매길 때 쓰는 값이라 면세점 판매가와는 관계가
          없습니다.
        </Note>
      </Section>

      <Section title="면세점에 적용되는 건 &lsquo;적용환율&rsquo;입니다">
        <p>
          이건 업계 관행이 아니라 법에 정해진 의무입니다.{" "}
          <strong>보세판매장 운영에 관한 고시 제3조 제4항</strong>이 세 가지를
          정하고 있습니다.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            물품을 파는 날의 <strong>전일(최종 고시한 날)</strong>에 고시된
            기준환율 또는 재정환율을 적용할 것
          </li>
          <li>
            소수점 이하 3자리에서 버린 뒤 <strong>소수점 2자리까지</strong> 표시할
            것 — 그래서 면세점 환율은 늘 <code>1,353.30</code> 처럼 두 자리입니다
          </li>
          <li>
            당일 적용환율을 매장 입구나 홈페이지에 <strong>게시</strong>할 것
          </li>
        </ol>
        <p className="mt-3">
          여기서 &lsquo;전일&rsquo;은 달력상의 어제가 아니라{" "}
          <strong>직전 고시일</strong>입니다. 주말과 공휴일에는 고시가 없으므로
          직전 영업일 값이 그대로 이어집니다. 예를 들어 금요일 아침에 고시된 값이
          토·일·월 사흘 내내 적용됩니다.
        </p>
      </Section>

      <Section title="그래서 내일 환율은 예측이 아닙니다">
        <p>
          적용환율이 만들어지는 순서를 펴 보면 이렇습니다.
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
{`이틀 전  09:00~15:30   은행 간 달러 거래 체결
                              │ 거래량 가중평균
어제     08:00          매매기준율 고시
                              │ 보세판매장 고시 §3④1
오늘     00:00          면세점 적용환율으로 전환 — 하루 종일 고정`}
        </pre>
        <p className="mt-3">
          오늘 아침 8시에 고시된 값은 <strong>내일</strong>의 면세점 적용환율로
          이미 확정돼 있습니다. 이 사이트가 내일 값을 보여줄 수 있는 이유가
          그것입니다. 예측이 아니라 이미 발표된 사실입니다.
        </p>
        <p className="mt-3">
          반대로 <strong>모레</strong> 값은 내일 아침 고시를 기다려야 알 수
          있습니다.
        </p>
      </Section>

      <Section title="뉴스에서 본 환율과 방향이 반대인 날이 절반입니다">
        <p>
          오늘 뉴스에 &lsquo;환율이 올랐다&rsquo;고 나와도, 오늘 면세점에서
          적용되는 환율은 내린 경우가 많습니다. 뉴스가 말하는 건 오늘 시장이고,
          면세점이 쓰는 건 이틀 전 시장을 반영한 값이기 때문입니다.
        </p>
        <p className="mt-3">
          2016년 1월부터 2026년 9월까지 2,560일을 전수 계산해 보면, 두 방향이
          반대인 날이 <strong>47.1%</strong>였습니다. 거의 정확히 반반입니다.
          이상 현상이 아니라 이틀의 시차가 만드는 구조적인 결과입니다.
        </p>
        <p className="mt-3">
          하루 차이로 벌어지는 폭은 중앙값 3.5원, 열흘에 하루꼴로는 10원을
          넘습니다. $300을 산다면 하루 차이로 3,000원 이상이 갈리는 날이
          한 달에 두세 번 있다는 뜻입니다.
        </p>
      </Section>

      <Section title="면세점 기준환율은 다른 이야기입니다">
        <p>
          국산 브랜드는 원화 공급가를 면세점 기준환율로 <strong>나눠서</strong>{" "}
          달러 진열가를 만듭니다. 기준환율을 올리면 달러 표시가는 오히려{" "}
          <strong>내려갑니다.</strong>
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
{`수입 브랜드   글로벌 달러가 → 진열가 $X → × 적용환율 → 원화 결제액
국산 브랜드   원화 공급가 ÷ 기준환율 → 진열가 $X → × 적용환율 → 원화 결제액`}
        </pre>
        <p className="mt-3">
          면세점의 정가는 달러입니다. 사이트에 뜨는 원화는 가격이 아니라 적용환율로
          환산한 표시값입니다. 기준환율은 1년에 서너 번만 바뀌고, 수입 브랜드에는
          적용되지 않습니다.
        </p>
      </Section>

      <Section title="2027년부터 산출 방식이 바뀝니다">
        <p>
          외국환거래규정 개정으로 2027년 1월부터 매매기준율은 시장평균환율(MAR)
          대신 <strong>시간가중평균환율(TWAP)</strong> 방식으로 산출됩니다. 외환시장이
          24시간 운영으로 바뀌면서 09:00~15:30 거래만으로 기준을 잡는 것이 맞지
          않게 됐기 때문입니다. 아침 8시 고시와 전일 적용 규칙은 그대로입니다.
        </p>
      </Section>

      <p className="mt-10 border-t pt-4 text-xs leading-relaxed text-slate-400">
        근거: 외국환거래규정 §1-2(7) · 보세판매장 운영에 관한 고시 제3조제4항 ·
        서울외국환중개 매매기준율 고시
      </p>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-3 leading-relaxed">{children}</div>
    </section>
  )
}

function Terms({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-4 space-y-4">
      {items.map(([term, description]) => (
        <div key={term} className="border-l-2 border-slate-200 pl-4">
          <dt className="font-semibold text-slate-900">{term}</dt>
          <dd className="mt-1">{description}</dd>
        </div>
      ))}
    </dl>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded bg-slate-50 p-4 text-sm text-slate-600">{children}</p>
  )
}
