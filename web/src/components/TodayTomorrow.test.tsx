import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import { parseRates } from "../lib/rates"
import TodayTomorrow from "./TodayTomorrow"

const CSV = `fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`

test("오늘과 내일 적용환율을 2자리로 보여준다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText("1,368.30")).toBeInTheDocument()
})

test("오늘과 내일에 각자의 적용일을 붙인다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("오늘 · 9/17(목)")).toBeInTheDocument()
  expect(screen.getByText("내일 · 9/18(금)")).toBeInTheDocument()
})

test("달을 넘어가도 내일 날짜가 맞는다", () => {
  const monthEnd = parseRates(`fix_date,rate,method,source,collected_at
2026-09-29,1350,MAR,smbs,2026-09-30T09:00:00+09:00
2026-09-30,1360,MAR,smbs,2026-10-01T09:00:00+09:00
`)
  render(<TodayTomorrow rates={monthEnd} today="2026-09-30" />)

  expect(screen.getByText("내일 · 10/1(목)")).toBeInTheDocument()
})

test("환율 정보 페이지로 가는 링크를 둔다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(
    screen.getByRole("link", { name: /환율이 정해지는 방식/ }),
  ).toHaveAttribute("href", "/guide")
})

test("영어판은 단위를 밝히고 영어 가이드로 보내며 오천엔 배너를 숨긴다", () => {
  withUserAgent("iPhone", () => {
    render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" lang="en" />)
  })

  expect(document.body).toHaveTextContent("Today · Sep 17 (Thu)")
  expect(document.body).toHaveTextContent("Tomorrow · Sep 18 (Fri)")
  expect(screen.getByText(/KRW per 1 USD/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /How this rate is set/ })).toHaveAttribute("href", "/en/guide")
  expect(screen.queryByRole("link", { name: /오천엔/ })).not.toBeInTheDocument()
})

test("일본어판은 단위를 밝히고 일본어 가이드로 보내며 오천엔 배너를 숨긴다", () => {
  withUserAgent("iPhone", () => {
    render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" lang="ja" />)
  })

  expect(screen.getByText("今日 · 9/17(木)")).toBeInTheDocument()
  expect(screen.getByText("明日 · 9/18(金)")).toBeInTheDocument()
  expect(screen.getByText(/1ドルあたりのウォン/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /レートの決まり方/ })).toHaveAttribute("href", "/ja/guide")
  expect(screen.queryByRole("link", { name: /오천엔/ })).not.toBeInTheDocument()
})

test("일본어판은 두 숫자를 같은 엔 레이트로 환산해 아래에 적는다", () => {
  const conversions = [{ currency: "JPY", fixingDate: "2026-09-17", krwPerUnit: 9.5, source: "smbs" }] as const
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" lang="ja" conversions={[...conversions]} />)

  // 1,353.30 / 9.50 = 142.45…, 1,368.30 / 9.50 = 144.03…
  expect(screen.getByText("約142.5円")).toBeInTheDocument()
  expect(screen.getByText("約144.0円")).toBeInTheDocument()
})

test("간체는 오늘·내일을 같은 CNY 환율로 환산한다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" lang="zh-Hans" conversions={[
    { currency: "CNY", fixingDate: "2026-09-17", krwPerUnit: 190, source: "ecb" },
  ]} />)
  expect(screen.getByText("约人民币7.12元")).toBeInTheDocument()
  expect(screen.getByText("约人民币7.20元")).toBeInTheDocument()
})

test("번체는 TWD·HKD 환산액을 가운뎃점으로 이어 한 줄로 표시한다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" lang="zh-Hant" conversions={[
    { currency: "TWD", fixingDate: "2026-09-17", krwPerUnit: 40, source: "smbs" },
    { currency: "HKD", fixingDate: "2026-09-16", krwPerUnit: 160, source: "ecb" },
  ]} />)
  const today = screen.getByText("約NT$33.8 · HK$8.46")
  expect(today).toHaveClass("whitespace-nowrap")
  expect(today).not.toHaveClass("absolute")
  expect(today).toHaveClass("text-[12px]")
  expect(screen.getByText("約NT$34.2 · HK$8.55")).toBeInTheDocument()
  expect(today.parentElement?.parentElement?.parentElement).toHaveClass("pb-7")
})

test("번체의 한 통화가 없으면 다른 통화를 표시하고 고시 전 숫자는 환산하지 않는다", () => {
  render(<TodayTomorrow rates={parseRates(CSV).slice(0, 1)} today="2026-09-17" lang="zh-Hant" conversions={[
    { currency: "HKD", fixingDate: "2026-09-16", krwPerUnit: 160, source: "ecb" },
  ]} />)
  expect(screen.getByText("待公布")).toBeInTheDocument()
  expect(screen.getAllByText(/^約HK\$/)).toHaveLength(1)
  expect(screen.queryByText(/NT\$/)).not.toBeInTheDocument()
  expect(screen.getByText("約HK$8.46").parentElement?.parentElement?.parentElement).toHaveClass("pb-7")
})

function withUserAgent(ua: string, run: () => void) {
  const original = navigator.userAgent
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: ua })
  try {
    run()
  } finally {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: original })
  }
}

test.each([
  { currency: "CNY", lang: "zh-Hans", krwPerUnit: 200.74, first: "约人民币6.97元", second: "约人民币6.99元" },
  { currency: "HKD", lang: "zh-Hant", krwPerUnit: 180, first: "約HK$7.78", second: "約HK$7.80" },
] as const)("$currency는 소수 둘째 자리로 작은 환율 차이를 표시한다", ({ currency, lang, krwPerUnit, first, second }) => {
  const rates = parseRates(`fix_date,rate,method,source,collected_at
2026-09-16,1400,MAR,smbs,x
2026-09-17,1404,MAR,smbs,x
`)
  render(<TodayTomorrow rates={rates} today="2026-09-17" lang={lang} conversions={[
    { currency, fixingDate: "2026-09-17", krwPerUnit, source: "ecb" },
  ]} />)
  expect(screen.getByText(first)).toBeInTheDocument()
  expect(screen.getByText(second)).toBeInTheDocument()
})

test("아이폰에서는 오천엔 앱 링크를 앱스토어로 건다", () => {
  withUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 NAVER(inapp; search)",
    () => {
      render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

      expect(screen.getByRole("link", { name: /오천엔 앱으로 챙기세요/ })).toHaveAttribute(
        "href",
        expect.stringContaining("apps.apple.com/kr/app/id6829470220"),
      )
    },
  )
})

test("안드로이드에서는 받을 수 없는 앱 링크를 보이지 않는다", () => {
  withUserAgent(
    "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
    () => {
      render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

      expect(screen.queryByText(/오천엔/)).not.toBeInTheDocument()
    },
  )
})

test("오르면 차액을 빨강으로, 같으면 회색으로 적는다", () => {
  render(<TodayTomorrow rates={parseRates(CSV)} today="2026-09-17" />)

  expect(screen.getByText("▲ 15.00")).toHaveClass("text-up")
})

test("두 값이 같으면 차액을 회색으로 적는다", () => {
  // 2026-09-19 는 토요일. 09-18 고시가 토·일 이틀을 덮으므로 두 값이 같다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.getByText("0.00")).toHaveClass("text-muted")
})

test("내일 고시가 아직 없으면 오늘만 보여준다", () => {
  const partial = parseRates(`fix_date,rate,method,source,collected_at
2026-09-16,1353.3,MAR,smbs,2026-09-17T09:00:00+09:00
`)
  render(<TodayTomorrow rates={partial} today="2026-09-17" />)

  expect(screen.getByText("1,353.30")).toBeInTheDocument()
  expect(screen.getByText("고시 전")).toBeInTheDocument()
  expect(screen.getByText("오늘 고시 후 공개됩니다")).toBeInTheDocument()
  // ⓘ 는 누르면 열리고 다른 곳을 누르면 닫힌다.
  fireEvent.click(screen.getByRole("button", { name: "고시 시각 안내" }))
  expect(screen.getByText(/공식 고시 시각은 영업일 오전 8시/)).toBeInTheDocument()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByText(/공식 고시 시각은 영업일 오전 8시/)).not.toBeInTheDocument()
  // 비교할 내일 값이 없으니 등락 칸도 없다.
  expect(screen.queryByText(/[▲▼]|^0\.00$/)).not.toBeInTheDocument()
})

test("고시가 멈춘 상태에서는 '고시 전'이라고 말하지 않는다", () => {
  // 09-17 이 마지막 고시인 채로 맞은 10-03(토). 빠진 평일이 7일을 넘어
  // 낡음이고, 이 상태에서 "고시 전"은 곧 나온다는 거짓말이 된다.
  const frozen = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
`)
  render(<TodayTomorrow rates={frozen} today="2026-10-03" />)

  expect(
    screen.getByText("9/17(목) 이후 고시가 확인되지 않습니다"),
  ).toBeInTheDocument()
  expect(screen.queryByText("고시 전")).not.toBeInTheDocument()
})

test("고시일을 잃어도 '고시 전'으로 돌아가지 않는다", () => {
  // CSV 가 깨져 고시일 셀이 빈 경우. 날짜는 못 붙이지만 낡음은 낡음이다.
  // 여기서 "고시 전"이 나가면, 데이터가 가장 망가진 순간에 가장 태연한 안내를
  // 하게 된다. parseRates 는 셀을 검증하지 않으므로 닿을 수 있는 경로다.
  const broken = parseRates(`fix_date,rate,method,source,collected_at
,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={broken} today="2026-10-03" />)

  expect(screen.getByText("고시가 확인되지 않습니다")).toBeInTheDocument()
  expect(screen.queryByText("고시 전")).not.toBeInTheDocument()
})

test("주말에는 오늘 고시가 없어도 내일을 확정으로 보여준다", () => {
  // 2026-09-19 는 토요일. 고시는 09-18(금)이 마지막이고 토요일 고시는 영영 없다.
  // 일요일 적용환율은 그 금요일 고시로 확정이므로 "미고시"가 뜨면 안 된다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.queryByText("고시 전")).not.toBeInTheDocument()
  expect(screen.getAllByText("1,380.30")).toHaveLength(2)
})

test("두 값이 같아도 차액 칸은 자리를 지킨다", () => {
  // 칸이 통째로 사라지면 58px 숫자 둘이 맞붙어 한 덩어리로 읽힌다.
  const weekend = parseRates(`fix_date,rate,method,source,collected_at
2026-09-17,1368.3,MAR,smbs,2026-09-18T09:00:00+09:00
2026-09-18,1380.3,MAR,smbs,2026-09-19T09:00:00+09:00
`)
  render(<TodayTomorrow rates={weekend} today="2026-09-19" />)

  expect(screen.getByText("0.00")).toBeInTheDocument()
})

const HOLIDAY = parseRates(`fix_date,rate,method,source,collected_at
2026-09-22,1384.3,MAR,smbs,2026-09-22T09:00:00+09:00
2026-09-23,1360,MAR,smbs,2026-09-23T09:00:00+09:00
`)

test("내일 값이 연휴 동안 이어지면 끝나는 날을 적는다", () => {
  // 2026 추석. 09-23 고시가 다음 고시일 09-28(월)까지 적용된다.
  render(<TodayTomorrow rates={HOLIDAY} today="2026-09-24" />)

  expect(
    screen.getByText("내일 환율은 9/28(월)까지 적용됩니다"),
  ).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "주말·공휴일 환율 안내" })).toBeInTheDocument()
})

test("연휴 전날에도 고시가 나오면 끝나는 날을 적는다", () => {
  // 방문자에게 제일 쓸모 있는 날이다 — 연휴 내내 이 값으로 산다.
  render(<TodayTomorrow rates={HOLIDAY} today="2026-09-23" />)

  expect(
    screen.getByText("내일 환율은 9/28(월)까지 적용됩니다"),
  ).toBeInTheDocument()
})

test("내일 하루만 적용되는 평일에는 기간을 적지 않는다", () => {
  // 09-22 고시는 09-23 하루만 적용된다. 09-23 고시가 이어받는다.
  render(<TodayTomorrow rates={HOLIDAY} today="2026-09-22" />)

  expect(screen.queryByText(/까지 적용됩니다/)).not.toBeInTheDocument()
})

test("휴장일 목록이 덮지 못하는 기간은 약속하지 않는다", () => {
  // 12-31 고시 다음 고시일은 2027 년이다. 목록이 없으니 날짜를 모른다.
  const yearEnd = parseRates(`fix_date,rate,method,source,collected_at
2026-12-30,1340,MAR,smbs,2026-12-30T09:00:00+09:00
2026-12-31,1350,MAR,smbs,2026-12-31T09:00:00+09:00
`)
  render(<TodayTomorrow rates={yearEnd} today="2026-12-31" />)

  expect(screen.getByText("1,350.00")).toBeInTheDocument()
  expect(screen.queryByText(/까지 적용됩니다/)).not.toBeInTheDocument()
})

const LATE_OCT = parseRates(`fix_date,rate,method,source,collected_at
2026-10-29,1336.3,MAR,smbs,2026-10-29T09:00:00+09:00
2026-10-30,1335.3,MAR,smbs,2026-10-30T09:00:00+09:00
2026-11-02,1340,MAR,smbs,2026-11-02T09:00:00+09:00
`)

test("일요일에는 오늘·내일이 같은 고시인 이유를 적는다", () => {
  // 10-30(금) 고시가 토·일·월에 적용된다. 일요일에는 내일(월)이 마지막 날이다.
  render(<TodayTomorrow rates={LATE_OCT.slice(0, 2)} today="2026-11-01" />)

  expect(
    screen.getByText("내일까지 10/30(금) 고시 환율이 적용됩니다"),
  ).toBeInTheDocument()

  // 마우스는 올리면 뜨고 내리면 사라진다. 누르면 내려도 남는다.
  const info = screen.getByRole("button", { name: "주말·공휴일 환율 안내" })
  const tip = () => screen.queryByText(/직전 영업일에 고시된/)
  fireEvent.pointerOver(info, { pointerType: "mouse" })
  expect(tip()).toBeInTheDocument()
  fireEvent.pointerOut(info, { pointerType: "mouse" })
  expect(tip()).not.toBeInTheDocument()
  fireEvent.pointerOver(info, { pointerType: "mouse" })
  fireEvent.click(info)
  fireEvent.pointerOut(info, { pointerType: "mouse" })
  expect(tip()).toBeInTheDocument()
  // 터치 탭은 hover 로 치지 않는다.
  fireEvent.click(info)
  fireEvent.pointerOver(info, { pointerType: "touch" })
  expect(tip()).not.toBeInTheDocument()
})

test("토요일에는 지금처럼 끝나는 날을 적는다", () => {
  render(<TodayTomorrow rates={LATE_OCT.slice(0, 2)} today="2026-10-31" />)

  expect(screen.getByText("내일 환율은 11/2(월)까지 적용됩니다")).toBeInTheDocument()
  expect(screen.queryByText(/고시 환율이 적용됩니다/)).not.toBeInTheDocument()
})

test("연휴 마지막 날에도 어느 고시인지 적는다", () => {
  // 추석. 09-23 고시가 09-28(월)까지 적용되고, 09-27(일)이 그 전날이다.
  render(<TodayTomorrow rates={HOLIDAY} today="2026-09-27" />)

  expect(
    screen.getByText("내일까지 9/23(수) 고시 환율이 적용됩니다"),
  ).toBeInTheDocument()
})

test("오늘·내일 값이 다른 월요일에는 아무것도 적지 않는다", () => {
  // 오늘은 10-30 고시, 내일은 11-02 고시.
  render(<TodayTomorrow rates={LATE_OCT} today="2026-11-02" />)

  expect(screen.queryByText(/적용됩니다/)).not.toBeInTheDocument()
})

test("휴장일 목록 밖의 일요일에는 \"내일까지\"를 약속하지 않는다", () => {
  // 2027 휴장일 목록이 없어 01-04(월)가 고시일인지 모른다. 값은 보여주되 기간은 적지 않는다.
  const newYear = parseRates(`fix_date,rate,method,source,collected_at
2026-12-31,1350,MAR,smbs,2026-12-31T09:00:00+09:00
2027-01-01,1352,MAR,smbs,2027-01-01T09:00:00+09:00
`)
  render(<TodayTomorrow rates={newYear} today="2027-01-03" />)

  expect(screen.getAllByText("1,352.00")).toHaveLength(2)
  expect(screen.queryByText(/적용됩니다/)).not.toBeInTheDocument()
})
