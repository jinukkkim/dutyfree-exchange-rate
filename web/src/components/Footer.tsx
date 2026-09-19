const REPORT_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체
const GITHUB_URL = "https://github.com/jinukkkim/dutyfree-exchange-rate"

export default function Footer() {
  return (
    <footer className="bg-tint px-6 pb-14 pt-11">
      <div className="mx-auto flex max-w-page gap-[22px] text-xs">
        <a href={REPORT_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
          제보하기
        </a>
        <a href={GITHUB_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
    </footer>
  )
}
