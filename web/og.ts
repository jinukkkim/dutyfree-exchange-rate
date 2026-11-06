import { createRequire } from "node:module"

import { Resvg } from "@resvg/resvg-js"

import { formatDayLabel, formatRate } from "./src/lib/format"
import { appliedOn, nextDay, type Rate } from "./src/lib/rates"

/*
 * 링크 미리보기(og:description, og.png)는 내일 환율 숫자를 말하지 않는다.
 * 미리보기에서 답이 끝나면 아무도 들어오지 않는다. 대신 "확정됐다"는 사실과
 * 지금 적용 중인 숫자만 준다.
 *
 * "오늘·내일" 대신 날짜로 쓴다. 카카오톡 등은 미리보기를 캐시하므로, 며칠 뒤에
 * 보여도 참인 문장이어야 한다.
 */

export function ogDescription(rates: Rate[]): string {
  const latest = rates.at(-1)
  if (!latest) throw new Error("og: rates.csv 에 고시가 없음")
  const fixed = formatDayLabel(latest.fixingDate)
  const from = formatDayLabel(nextDay(latest.fixingDate))
  // 고시일 당일에 적용되는 것은 그 전 고시다. 첫 행이면 없으니 문장을 뺀다.
  const current = appliedOn(rates, latest.fixingDate)
  const lead = current ? `${fixed} 면세점 환율은 ${formatRate(current.rate)}원입니다. ` : ""
  return `${lead}${from}부터 적용될 환율은 ${fixed} 08시 고시로 확정됐습니다. 지금 확인하세요.`
}

const require = createRequire(import.meta.url)
const font = (weight: string) => require.resolve(`pretendard/dist/public/static/Pretendard-${weight}.otf`)
const FONT = {
  fontFiles: [font("Regular"), font("Bold")],
  loadSystemFonts: false,
  defaultFontFamily: "Pretendard",
}

/** 렌더된 글자의 오른쪽 끝. 배지 알약 폭을 날짜 길이(1/5 ~ 12/31)에 맞추려고 잰다. */
function inkRight(text: string, size: number): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><text x="0" y="100" font-family="Pretendard" font-weight="700" font-size="${size}">${text}</text></svg>`
  const box = new Resvg(svg, { font: FONT }).innerBBox()
  if (!box?.width) throw new Error("og: 글꼴을 읽지 못해 글자 폭을 잴 수 없음")
  return box.x + box.width
}

/** 캔버스 D안(1200×630). 색은 tailwind.config.js 의 토큰 값이다. */
export function renderOgImage(rates: Rate[]): Buffer {
  const latest = rates.at(-1)
  if (!latest) throw new Error("og: rates.csv 에 고시가 없음")
  const badge = `${formatDayLabel(latest.fixingDate)} 08시 고시 완료`
  const from = formatDayLabel(nextDay(latest.fixingDate))
  const pill = 22 + 26 + 12 + inkRight(badge, 28) + 24

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <rect width="1200" height="14" fill="#0071E3"/>
  <rect x="96" y="102" width="${pill}" height="58" rx="29" fill="#E7EFFF"/>
  <path d="M122 131.5 L128 137.5 L139.5 125" fill="none" stroke="#0B4EC2" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="156" y="141" font-family="Pretendard" font-weight="700" font-size="28" fill="#0B4EC2">${badge}</text>
  <g font-family="Pretendard" font-weight="700" font-size="96" letter-spacing="-3.8" fill="#1D1D1F">
    <text x="96" y="290">${from} 면세점 환율을</text>
    <text x="96" y="396">확인하세요</text>
  </g>
  <text x="96" y="580" font-family="Pretendard" font-weight="400" font-size="28" fill="#424245">롯데·신라·신세계·현대 공통</text>
  <text x="1104" y="580" text-anchor="end" font-family="Pretendard" font-weight="400" font-size="28" fill="#6E6E73">dutyfreerate.com</text>
</svg>`
  return new Resvg(svg, { font: FONT }).render().asPng()
}
