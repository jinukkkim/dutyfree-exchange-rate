/**
 * 사이트가 스스로 자기 신선도를 판정한다.
 *
 * 판정 기준은 **고시일**이다. 수집 시각이 아니다 — 원본이 고시를 멈추면 새 행이
 * 생기지 않아 커밋도 재빌드도 없고, 방문자가 받는 번들은 그대로 얼어붙는다.
 * 그래서 "수집기가 죽었다"와 "원본이 죽었다"는 브라우저에서 구별되지 않으며,
 * 여기서 알 수 있는 사실은 하나뿐이다: 있어야 할 고시가 며칠째 없다.
 *
 * 방문자에게 배너로 알리지는 않는다. 대신 낡은 동안에는 내일 값을 "확정"이라고
 * 부르지 않는다 — isTomorrowConfirmed 가 이 판정을 쓴다. 낡은 데이터를 멀쩡한
 * 척 보여주는 것이 이 분야에서 제일 나쁜 실패이고, 화면에서 사라져도 되는 것은
 * 경고문이지 그 판정이 아니다.
 *
 * 운영자용 경보는 별개다(수집 워크플로가 실패하면 GitHub 이 메일을 보낸다).
 */

/**
 * 이만큼의 평일이 고시 없이 지나가면 낡은 것으로 본다.
 *
 * 공휴일 달력을 두지 않는 것이 이 프로젝트의 설계이므로 연휴도 그대로 "빠진
 * 평일"로 세어진다. 최장 연휴인 2017 추석(9/30~10/9)이 평일 6일을 비웠으니,
 * 그보다 많이 비어야 진짜 정체다. 오탐 0 을 사는 대가로 탐지가 열흘쯤 늦다.
 */
export const STALE_AFTER_MISSED_FIXINGS = 6

/**
 * 고시가 나는 날인가. 공휴일 달력을 두지 않는 것이 이 프로젝트의 설계이므로
 * 평일이면 참이다 — 연휴도 여기서는 고시가 있어야 할 날로 세어진다.
 *
 * 신선도(빠진 고시 세기)와 확정 판정(주말 예외)이 같은 정의를 써야 한다.
 * 갈라 두면 반일 고시 같은 규칙이 생겼을 때 한쪽만 고쳐도 증상이 없다.
 */
export function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay()
  return weekday >= 1 && weekday <= 5
}

/** 마지막 고시 다음날부터 어제까지 고시가 없던 평일이 한계를 넘었는가. */
export function isStale(
  latestFixingDate: string | undefined,
  today: string,
): boolean {
  if (!latestFixingDate) return true
  const cursor = new Date(`${latestFixingDate}T00:00:00Z`)
  if (Number.isNaN(cursor.getTime())) return true

  // 오늘은 세지 않는다. 오늘 고시는 08 시경에 나오므로 아직 없는 것이 정상이고,
  // 그 하루는 isTomorrowConfirmed 가 "아직 고시되지 않았습니다"로 이미 다룬다.
  let missed = 0
  cursor.setUTCDate(cursor.getUTCDate() + 1)
  while (cursor.toISOString().slice(0, 10) < today) {
    if (isBusinessDay(cursor)) missed += 1
    if (missed > STALE_AFTER_MISSED_FIXINGS) return true
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return false
}
