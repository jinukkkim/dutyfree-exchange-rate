# 운영

## 설치

```bash
git clone <repo> /home/ubuntu/duty-free-exchange-rate
cd /home/ubuntu/duty-free-exchange-rate/collector
python3.12 -m venv .venv
.venv/bin/pip install -e .
```

git push 자격증명은 deploy key 로 설정한다.

수집기는 `main` 에서만 동작한다. `collect.sh` 가 현재 브랜치를 확인하고 다르면
거부한다 — 인자 없는 `git push` 가 엉뚱한 브랜치로 나가 데이터가 조용히 다른
곳에 쌓이는 것을 막기 위해서다.

## 데드맨 스위치

healthchecks.io 에서 일간 체크를 만들고 URL 을 파일에 둔다. 크론 줄에 인라인으로
쓰면 cron 이 저널에 명령 전체를 남겨 자격증명의 영구 사본이 생긴다.

```bash
echo 'HEALTHCHECK_URL=https://hc-ping.com/<uuid>' > /home/ubuntu/.dfx_healthcheck
chmod 600 /home/ubuntu/.dfx_healthcheck
```

Grace period 는 36시간으로 잡는다. 하루 한 번 도는 크론이 한 번 건너뛰어도
즉시 울리지 않되, 이틀 연속 실패는 잡는다.

## 크론

```bash
crontab -e   # deploy/crontab.example 내용을 붙여넣는다
```

## 백업

데이터가 git 에 있으므로 GitHub 와 모든 클론이 백업이다. 스냅샷과 달리 변경
이력까지 남으므로 별도 백업 작업은 없다.

## 로그

- 수집기 실행: `/home/ubuntu/dfx.log`
- 데이터 변경 이력: `git log -- data/`
