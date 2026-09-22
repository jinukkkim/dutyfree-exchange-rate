# 면세점 환율

한국 면세점 **적용환율**을 매일 기록·공개하고, **면세점 기준환율**(국산품용) 변경
이력을 아카이브한다.

내일 적용환율은 예측이 아니다. 오늘 08:00 에 고시된 매매기준율이 법령에 따라
내일 그대로 적용된다(보세판매장 운영에 관한 고시 제3조제4항).

- 도메인·용어·법령 근거: [`docs/domain-reference.md`](docs/domain-reference.md)
- 설계: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- 운영: 수집은 GitHub Actions 에 매시간으로 예약돼 있다 →
  [`collect.yml`](.github/workflows/collect.yml). 다만 GitHub 이 예약 틱을 상당수
  버려서 실제 실행은 하루 4~5 회 수준이다(2026-09-22 관측). 멈춤은 워치독이 하루
  안에 실패 메일로 알린다 → [`watchdog.yml`](.github/workflows/watchdog.yml)

## 구조

| 경로 | 역할 |
|---|---|
| `collector/` | 서울외국환중개 수집기 (Python 3.12). GitHub Actions 가 매시간 실행 |
| `data/` | CSV 아카이브. git 이 곧 저장소이자 백업이며 감사 이력 |
| `web/` | 정적 사이트 (React + Vite). Vercel 이 data 커밋마다 재빌드 |
| `trigger/` | Cloudflare Worker. 매시간 수집 워크플로를 깨운다 — GitHub 예약이 틱을 대부분 버려서 |

## 개발

```bash
cd collector && python3.12 -m venv .venv && .venv/bin/pip install -e . --group dev
.venv/bin/pytest

cd ../web && npm ci && npm test && npm run dev
```

라이선스: [MIT](LICENSE)
