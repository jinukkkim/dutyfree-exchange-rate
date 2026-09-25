import type { ReactNode } from "react"

const REPORT_URL = "https://forms.gle/BiUMAooGEX3MKWF1A"
const GITHUB_URL = "https://github.com/jinukkkim/dutyfree-exchange-rate"

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
        매매기준율: 서울외국환중개 고시 · 기준환율: 각 면세점 공개값
      </p>
      {/* 링크 줄은 늘 맨 아래다. 푸터에 뭘 더하든 이 위에 넣는다. */}
      <nav className="mx-auto mt-4 flex max-w-page gap-[22px] text-xs">
        <a href={REPORT_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
          제보하기
        </a>
        <a href={GITHUB_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </nav>
    </footer>
  )
}
