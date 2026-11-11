import { createRequire } from "node:module"

import { Resvg } from "@resvg/resvg-js"

import { formatDayLabel, formatRate, pick, type Lang } from "./src/lib/format"
import { nextFixingDate } from "./src/lib/freshness"
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

/*
 * 검색 결과 설명(meta description)과 JS 를 안 돌리는 크롤러용 본문 문장.
 * 네이버는 이 설명을 그대로 보여 주고(2026-11-10 확인), 구글은 렌더된 화면 글자를 쓴다.
 *
 * "오늘·내일"은 검색어와 맞추는 표제일 뿐 어느 숫자도 가리키지 않는다. 숫자에는
 * 날짜를 붙인다. 검색 결과는 하루 이상 지난 사본일 수 있어서, 숫자를 "내일"이라
 * 부르면 다음 날 틀린 문장이 된다.
 *
 * "08시"는 쓰지 않는다. 값은 보통 새벽에 반영되어 아직 안 온 시각이 되기 때문이다.
 */
export function searchDescription(rates: Rate[], lang: Lang = "ko"): string {
  const latest = rates.at(-1)
  if (!latest) throw new Error("og: rates.csv 에 고시가 없음")

  const t = pick(lang)
  const day = (iso: string) => formatDayLabel(iso, lang)
  const from = nextDay(latest.fixingDate)
  const through = nextFixingDate(latest.fixingDate)
  const period =
    through && through > from ? `${day(from)}${t("~", " - ", "〜", "至", "至")}${day(through)}` : day(from)

  const current = appliedOn(rates, latest.fixingDate)
  let comparison = ""
  if (current) {
    const delta = latest.rate - current.rate
    const change = formatRate(Math.abs(delta))
    const before = formatRate(current.rate)
    const was = day(latest.fixingDate)
    const up = delta > 0
    comparison =
      delta === 0
        ? t(
            `, ${was} ${before}원에서 변동 없음`,
            `, unchanged from ${before} on ${was}`,
            `、${was}の${before}ウォンから変動なし`,
            `，与${was}的${before}韩元持平`,
            `，與${was}的${before}韓元持平`,
          )
        : t(
            `, ${was} ${before}원보다 ${change}원 ${up ? "오름" : "내림"}`,
            `, ${up ? "up" : "down"} ${change} from ${before} on ${was}`,
            `、${was}の${before}ウォンから${change}ウォン${up ? "上昇" : "下落"}`,
            `，比${was}的${before}韩元${up ? "上涨" : "下降"}${change}韩元`,
            `，比${was}的${before}韓元${up ? "上漲" : "下降"}${change}韓元`,
          )
  }

  const fixed = day(latest.fixingDate).split("(")[0].trim()
  const rate = formatRate(latest.rate)
  return t(
    `오늘·내일 면세점 환율. ${period} 1달러 ${rate}원${comparison}. ${fixed} 고시로 확정.`,
    `Korea duty free exchange rate. ${period} 1 USD = ${rate} KRW${comparison}. Published ${fixed}.`,
    `韓国免税店の為替レート。${period} 1ドル = ${rate}ウォン${comparison}。${fixed}公表。`,
    `韩国免税店汇率。${period} 1美元 = ${rate}韩元${comparison}。${fixed}公布。`,
    `韓國免稅店匯率。${period} 1美元 = ${rate}韓元${comparison}。${fixed}公布。`,
  )
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
