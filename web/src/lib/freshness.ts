/**
 * 사이트가 스스로 자기 신선도를 판정한다.
 *
 * 서버도 헬스 엔드포인트도 없지만, 마지막 수집 시각을 현재 시각과 비교하는 것만으로
 * 방문자에게 낡음을 알릴 수 있다. 낡은 데이터를 멀쩡한 척 보여주는 것이 이 분야에서
 * 제일 나쁜 실패다 — devremon 은 깨진 빈 차트를 몇 달째 띄우고 있다.
 *
 * 운영자용 경보는 별개다(수집 워크플로가 실패하면 GitHub 이 메일을 보낸다).
 * 이쪽은 방문자용이다 — 워크플로가 아예 돌지 않은 경우는 저쪽이 못 잡는다.
 */
export const STALE_AFTER_HOURS = 72

export function isStale(latestCollectedAt: string, now: Date): boolean {
  const collected = new Date(latestCollectedAt).getTime()
  if (Number.isNaN(collected)) return true
  return now.getTime() - collected > STALE_AFTER_HOURS * 3600 * 1000
}
