const REPORT_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체
const GITHUB_URL = "https://github.com/jinukkkim/dutyfree-exchange-rate"

export default function Footer() {
  return (
    <footer className="mt-8 border-t px-4 py-8 text-sm text-slate-500">
      <nav className="flex justify-center gap-6">
        <a href={REPORT_URL} className="underline underline-offset-2" rel="noreferrer">
          제보하기
        </a>
        <a href={GITHUB_URL} className="underline underline-offset-2" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </footer>
  )
}
