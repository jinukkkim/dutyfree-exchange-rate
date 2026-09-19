const REPORT_URL = "https://example.com/report" // Task 14 에서 실제 주소로 교체
const GITHUB_URL = "https://github.com/jinukkkim/dutyfree-exchange-rate"

export default function Footer() {
  return (
    <footer className="bg-tint px-6 pb-14 pt-11">
      <div className="mx-auto max-w-page">
        <p className="max-w-[720px] text-xs leading-relaxed text-muted">
          보세판매장 운영에 관한 고시 제3조제4항에 따라, 서울외국환중개가
          고시일 08시에 발표한 매매기준율이 그다음 영업일의 면세점 적용환율이
          됩니다. 예측이 아니라 이미 정해진 값입니다.
        </p>
        <div className="mt-6 flex gap-[22px] border-t border-rule pt-[18px] text-xs">
          <a href={REPORT_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
            제보하기
          </a>
          <a href={GITHUB_URL} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
