import { useState, type ReactNode } from "react"

import baseRatesCsv from "../../../data/base_rates.csv?raw"

import { parseBaseRates } from "../lib/baseRates"

const REPORT_URL = "https://forms.gle/BiUMAooGEX3MKWF1A"
// smbs.biz 는 https 를 받지 않는다. 이동 링크라 혼합 콘텐츠 문제는 없다.
const FIXING_URL = "http://www.smbs.biz/ExRate/StdExRate.jsp"
// 기준환율은 면세점 사이트가 아니라 보도로 확인된다. 지금 값의 출처로 보낸다.
const BASE_RATE_URL = parseBaseRates(baseRatesCsv).find((r) => r.status === "confirmed")?.sourceUrl

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const
const SOURCE_LINK = "underline decoration-rule underline-offset-2 hover:text-ink"
const NAV_LINK = "text-link hover:underline"

/** 모바일은 시스템 공유 시트, 그게 없으면 링크 복사로 떨어진다. */
function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      // 사용자가 시트를 닫아도 reject 된다. 고장이 아니라 무시한다.
      await navigator.share({ title: document.title, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" onClick={share} className={NAV_LINK}>
      {copied ? "링크 복사됨" : "공유하기"}
    </button>
  )
}

/** children 은 본문 각주다. 번호를 단 쪽이 같은 조건으로 넘긴다. */
export default function Footer({ children }: { children?: ReactNode }) {
  return (
    <footer className="bg-tint px-6 pb-14 pt-11">
      {children && (
        <ol className="mx-auto mb-4 max-w-page list-decimal pl-4 text-xs leading-relaxed text-muted">
          {children}
        </ol>
      )}
      <p className="mx-auto max-w-page text-xs text-muted">
        매매기준율:{" "}
        <a href={FIXING_URL} className={SOURCE_LINK} {...EXTERNAL}>
          서울외국환중개 고시
        </a>{" "}
        · 기준환율:{" "}
        {BASE_RATE_URL ? (
          <a href={BASE_RATE_URL} className={SOURCE_LINK} {...EXTERNAL}>
            각 면세점 공개값
          </a>
        ) : (
          "각 면세점 공개값"
        )}
      </p>
      <p className="mx-auto mt-1 max-w-page text-xs text-muted">
        참고용이며, 실제 결제 환율은 결제 시점 면세점 고지를 따릅니다.
      </p>
      {/* 링크 줄은 늘 맨 아래다. 푸터에 뭘 더하든 이 위에 넣는다. */}
      <nav className="mx-auto mt-4 flex max-w-page gap-[22px] text-xs">
        <a href={REPORT_URL} className={NAV_LINK} {...EXTERNAL}>
          제보하기
        </a>
        <ShareButton />
      </nav>
    </footer>
  )
}
