# 운영

## 설치

**전부 박스 안에서 실행한다.** `/home/ubuntu` 는 우분투 경로이고 맥에는 없다 —
로컬에서 돌리면 clone 이 실패한 뒤 뒤 명령이 현재 디렉터리에서 실행된다.

### 1. deploy key

수집기가 스스로 push 하므로 쓰기 권한이 필요하다. 박스에서 만든다 — 개인키가
노트북에 사본으로 남을 이유가 없다.

```bash
ssh-keygen -t ed25519 -C "dfx-collector" -f ~/.ssh/dfx_deploy -N ""
cat ~/.ssh/dfx_deploy.pub
```

출력된 한 줄을 GitHub → Settings → Deploy keys 에 등록하고 **Allow write access
를 체크한다.** 빠뜨리면 clone 은 되고 push 만 매일 실패하며, 그 실패는 다음 날
로그를 볼 때까지 보이지 않는다.

이어서 `~/.ssh/config` 에 호스트 별칭을 만든다. **다른 리포의 키가 있든 없든
필요한 단계다** — 위에서 만든 `dfx_deploy` 는 ssh 가 자동으로 집어드는 기본
식별 파일명(`id_ed25519` 등)이 아니므로, 별칭이 없으면 ssh 가 이 키를 아예
쓰지 않는다. 아래 clone 명령이 `github-dfx` 를 쓰기 때문에 건너뛰면
`Could not resolve hostname github-dfx` 로 죽는다.

```bash
cat >> ~/.ssh/config <<'EOF'

Host github-dfx
  HostName github.com
  User git
  IdentityFile ~/.ssh/dfx_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

ssh -T git@github-dfx    # "Hi <owner>/<repo>!" 가 나와야 한다
```

### 2. 클론과 설치

```bash
git clone git@github-dfx:<owner>/<repo>.git /home/ubuntu/duty-free-exchange-rate
cd /home/ubuntu/duty-free-exchange-rate/collector
python3.12 -m venv .venv
.venv/bin/pip install -e .
```

`python3.12 -m venv` 가 실패하면 `sudo apt install -y python3.12-venv`.

### 3. git 신원

**이걸 빼면 매일 실패한다.** `collect.py` 가 `git commit` 을 부르는데, 신원이
없으면 "Please tell me who you are" 로 죽는다. 리포 로컬 설정이라 박스의 다른
프로젝트에는 영향이 없다.

```bash
cd /home/ubuntu/duty-free-exchange-rate
git config user.name "dfx collector"
git config user.email "<your-email>"
```

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

`crontab.example` 은 박스가 `Etc/UTC` 로 도는 것을 전제한다. 먼저 확인한다:

```bash
timedatectl | grep "Time zone"    # Etc/UTC 여야 한다
```

KST 로 돌고 있으면 `0 0` 대신 `0 9` 로 바꾼다.

**크론을 걸기 전에 손으로 한 번 돌린다.** 크론 실패는 하루에 한 번만 드러나므로
여기서 잡는 편이 훨씬 싸다.

```bash
/home/ubuntu/duty-free-exchange-rate/deploy/collect.sh
# 기대: "no change (latest fixing ...)" 또는 커밋 1 건
```

박스에 다른 크론이 이미 있으면 `crontab -e` 로 열어 **덧붙인다**. 기존 항목을
지우지 않도록 아래처럼 append 하는 편이 안전하다:

```bash
(crontab -l; echo; cat /home/ubuntu/duty-free-exchange-rate/deploy/crontab.example) | crontab -
crontab -l    # 기존 항목이 남아 있는지 확인
```

## 백업

데이터가 git 에 있으므로 GitHub 와 모든 클론이 백업이다. 스냅샷과 달리 변경
이력까지 남으므로 별도 백업 작업은 없다.

## 로그

- 수집기 실행: `/home/ubuntu/dfx.log`
- 데이터 변경 이력: `git log -- data/`
