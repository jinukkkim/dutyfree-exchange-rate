const REPORT_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체
const GITHUB_URL = "https://github.com/jinukkkim/dutyfree-exchange-rate"

export default function Footer() {
  return (
    <footer className="mt-11 border-t border-rule px-4 pb-12 pt-6">
      <nav className="flex justify-center gap-6 text-[13px]">
        <a href={REPORT_URL} className="text-sub underline underline-offset-[3px]" target="_blank" rel="noopener noreferrer">
          제보하기
        </a>
        <a href={GITHUB_URL} className="text-sub underline underline-offset-[3px]" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </nav>
      <p className="mt-3 text-center text-[11.5px] text-muted">
        서울외국환중개 매매기준율
      </p>
    </footer>
  )
}
