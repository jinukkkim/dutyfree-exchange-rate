import { useRef, useState } from "react"

import { formatDayLabel, formatRate, pick, type Lang } from "../lib/format"
import type { Conversion } from "../lib/rates"

const REPORT_URL = "https://forms.gle/BiUMAooGEX3MKWF1A"
// smbs.biz 는 https 를 받지 않는다. 이동 링크라 혼합 콘텐츠 문제는 없다.
const FIXING_URL = "http://www.smbs.biz/ExRate/StdExRate.jsp"

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const
const SOURCE_LINK = "underline decoration-rule underline-offset-2 hover:text-ink"
const NAV_LINK = "text-link hover:underline"

/** 모바일은 시스템 공유 시트, 그게 없으면 링크 복사로 떨어진다. */
function ShareButton({ lang }: { lang: Lang }) {
  const t = pick(lang)
  const idle = t("공유하기", "Share", "共有", "分享", "分享")
  const [label, setLabel] = useState(idle)
  const timer = useRef<number>()

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      // 사용자가 시트를 닫아도 reject 된다. 고장이 아니라 무시한다.
      await navigator.share({ title: document.title, url }).catch(() => {})
      return
    }
    // 권한 거부면 reject, 비보안 컨텍스트면 clipboard 자체가 없다. 둘 다 말없이
    // 끝나면 버튼이 고장 난 것처럼 보인다.
    const ok = await navigator.clipboard?.writeText(url).then(() => true, () => false)
    setLabel(
      ok
        ? t("링크 복사됨", "Link copied", "リンクをコピーしました", "链接已复制", "已複製連結")
        : t("복사 실패", "Copy failed", "コピーできませんでした", "复制失败", "複製失敗"),
    )
    // 연달아 누르면 앞 타이머가 새 문구를 일찍 지운다.
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setLabel(idle), 2000)
  }

  return (
    <button type="button" onClick={share} className={NAV_LINK}>
      {label}
    </button>
  )
}

/**
 * 최근 고시일은 수집이 며칠 멈췄을 때를 위한 것이다. 신선도 판정이 낡음을
 * 선언하기 전(빠진 고시 6일 이하)에는 오늘 숫자가 아무 표시 없이 뜨므로,
 * 그 숫자가 언제 고시인지 출처 옆에 적어 둔다.
 */
export default function Footer({
  latestFixingDate,
  lang = "ko",
  conversions = [],
}: {
  latestFixingDate?: string
  lang?: Lang
  conversions?: Conversion[]
}) {
  const t = pick(lang)
  return (
    <footer className="bg-tint px-6 pb-14 pt-11">
      <p className="mx-auto max-w-page text-xs text-muted">
        {t("매매기준율: ", "Base rate: ", "基準レート: ", "基准汇率：", "基準匯率：")}
        <a href={FIXING_URL} className={SOURCE_LINK} {...EXTERNAL}>
          {t("서울외국환중개 고시", "Seoul Money Brokerage Services", "ソウル外国為替仲介", "首尔外汇经纪（SMBS）", "首爾外匯經紀（SMBS）")}
        </a>
        {latestFixingDate &&
          ` · ${t("최근 고시", "Last published", "最終公表", "最近公布", "最近公布")} ${formatDayLabel(latestFixingDate, lang)}`}
      </p>
      <p className="mx-auto mt-1 max-w-page text-xs text-muted">
        {t(
          "참고용이며, 실제 결제 환율은 결제 시점 면세점 고지를 따릅니다.",
          "For reference only. The rate shown by the duty free shop at checkout is final.",
          "参考情報です。実際の決済レートは、決済時に免税店が表示するレートに従います。",
          "仅供参考，实际结算汇率以付款时免税店公布的汇率为准。",
          "僅供參考，實際結帳匯率以付款時免稅店公布的匯率為準。",
        )}
      </p>
      {conversions.map((conversion) => {
        const day = formatDayLabel(conversion.fixingDate, lang)
        const rate = formatRate(conversion.krwPerUnit)
        const source = conversion.source === "ecb" ? "ECB" : "SMBS"
        const currency = conversion.currency === "TWD" ? "新台幣" : "港幣"
        return (
          <p key={conversion.currency} className="mx-auto mt-1 max-w-page text-xs text-muted">
            {conversion.currency === "JPY"
              ? `円換算は${day}公表のレート(100円 = ${formatRate(conversion.krwPerUnit * 100)}ウォン)による目安です。カード会社のレートや手数料は含みません。`
              : conversion.currency === "CNY"
                ? `人民币换算参考${day}的${source}汇率（1元人民币 = ${rate}韩元），不含发卡机构的汇率差额及手续费。`
                : `${currency}換算參考${day}的${source}匯率（1${currency} = ${rate}韓元），不含發卡機構的匯率差額及手續費。`}
          </p>
        )
      })}
      {/* 링크 줄은 늘 맨 아래다. 푸터에 뭘 더하든 이 위에 넣는다.
          제보 폼은 한국어뿐이라 외국어판에서는 뺀다. */}
      <nav className="mx-auto mt-4 flex max-w-page gap-[22px] text-xs">
        {lang === "ko" && (
          <a href={REPORT_URL} className={NAV_LINK} {...EXTERNAL}>
            제보하기
          </a>
        )}
        <ShareButton lang={lang} />
      </nav>
    </footer>
  )
}
