/**
 * collect.yml 을 매시간 workflow_dispatch 로 깨운다.
 *
 * GitHub 의 schedule 트리거가 예약 틱을 대부분 버린다. 2026-09-21 12:44(cron
 * 활성) ~ 09-22 14:30 관측치로 예정 26 틱 중 5 회(19%)만 실행됐고, 공백이
 * 최대 6.6 시간이었다. 설정 문제가 아니다 — cron 식 유효, 워크플로 active,
 * 기본 브랜치에 존재, 큐 대기 0 을 모두 확인했고 GitHub 문서 자체가 정확한
 * 타이밍에 의존하지 말라고 한다.
 *
 * 왜 매시간이어야 하는지는 collect.py 의 모듈 docstring 에 있다. 요약하면
 * 공표 시각을 아무도 모르고, 이 스케줄 자체가 그것을 관측하는 수단이다.
 * 6 시간 해상도로는 몇 주를 모아도 창이 좁혀지지 않는다.
 *
 * collect.yml 의 cron 은 지우지 않는다. 이 Worker 가 죽어도 GitHub 이 하루
 * 네댓 번은 돌려주므로, 둘을 겹쳐 두면 고장이 완전 정지가 아니라 해상도
 * 저하로 떨어진다. 같은 회차가 겹쳐도 해롭지 않다 — upsert 가 값이 안 바뀐
 * 행을 건드리지 않고, 워크플로의 concurrency 가 push 충돌을 막는다.
 *
 * 이 Worker 가 조용히 죽는 경우를 여기서 잡지는 않는다. dispatch 가 실패하면
 * 수집이 멈추고, 그것을 watchdog.yml 이 24 시간 안에 실패 메일로 알린다.
 * 경보를 두 군데 두면 둘 다 반만 믿게 된다.
 */

const REPO = "jinukkkim/dutyfree-exchange-rate"
const WORKFLOW = "collect.yml"

export default {
  async scheduled(event, env) {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          // GitHub API 는 User-Agent 를 요구한다. 없으면 403 으로 막힌다.
          "User-Agent": "dfx-collect-trigger",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    )

    // 정상은 204 No Content 다. 그 외에는 throw 해서 Cloudflare 쪽에 실패로
    // 남긴다(`wrangler tail` 로 보인다). 여기서 조용히 넘기면 토큰 만료 같은
    // 고장이 watchdog 의 24 시간을 다 기다려야 드러난다.
    if (response.status !== 204) {
      throw new Error(
        `dispatch failed: ${response.status} ${await response.text()}`,
      )
    }
  },
}
