#!/usr/bin/env bash
# KST 09:00 크론이 부른다. 매매기준율은 영업일 08:00 에 한 번 고시되고 그날 안에
# 바뀌지 않으므로, 한 시간 여유를 두고 하루 한 번이면 충분하다.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/duty-free-exchange-rate}"
HEALTHCHECK_FILE="${HEALTHCHECK_FILE:-/home/ubuntu/.dfx_healthcheck}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

# collect.py 는 인자 없는 `git push` 를 쓴다 — 현재 브랜치가 어디든 그 브랜치로
# 나간다. 박스에서 잠깐 다른 브랜치를 보다가 되돌려놓지 않으면 데이터가 조용히
# 엉뚱한 곳에 쌓이고, 사이트는 갱신되지 않는데 크론은 매일 성공한다.
current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
	echo "refusing to collect: on branch '$current', expected '$BRANCH'" >&2
	exit 1
fi

# 로컬 커밋이 쌓여 있으면 push 가 거부되므로 먼저 맞춘다. 데이터는 이 박스만
# 쓰지만, 사람이 GitHub 에서 base_rates.csv 를 고칠 수 있다.
git pull --rebase --quiet

"$APP_DIR/collector/.venv/bin/python" -m dfx.collect

# 죽은 크론은 스스로 신고하지 못한다. 성공했을 때만 신호를 보내고, 신호가
# 끊기면 healthchecks.io 가 메일을 보낸다. 이 ping 의 뜻은 "수집기가 정상
# 동작했다"이지 "새 고시가 있었다"가 아니다 — 주말·공휴일에도 ping 한다.
#
# 토큰을 크론 줄에 인라인으로 쓰지 않는 이유: cron 은 실행한 명령을 저널에
# 그대로 남기므로 자격증명의 영구 사본이 생긴다.
if [ -r "$HEALTHCHECK_FILE" ]; then
	# shellcheck source=/dev/null
	. "$HEALTHCHECK_FILE"
	curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" > /dev/null
else
	echo "missing $HEALTHCHECK_FILE — see deploy/README.md" >&2
fi
