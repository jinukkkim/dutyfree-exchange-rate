"""main() 의 분기 — 네트워크와 git 을 걷어내고 호출만 센다.

매시간 돌기 시작하면서 생긴 두 가지를 고정한다. 새 고시가 없으면 남의 상용
사이트를 치지 않는다는 것, 그리고 push 앞에 rebase 가 선다는 것.
"""

from datetime import date

import pytest

from dfx import collect
from dfx.store import Row, write_rates

EXISTING = [
    Row(date(2026, 9, 17), 1368.3, "MAR", "smbs+ssgdfs", "2026-09-17T09:00:12+09:00"),
    Row(date(2026, 9, 18), 1380.3, "MAR", "smbs+ssgdfs", "2026-09-18T09:00:09+09:00"),
]


@pytest.fixture
def run(tmp_path, monkeypatch):
    path = tmp_path / "rates.csv"
    write_rates(path, EXISTING)
    monkeypatch.setattr(collect, "RATES_PATH", path)
    monkeypatch.setattr(collect, "today_kst", lambda: date(2026, 9, 21))

    log = {"cross_check": 0, "git": []}

    def fake_cross_check(client, rows, today):
        log["cross_check"] += 1
        return True

    monkeypatch.setattr(collect, "cross_check", fake_cross_check)
    monkeypatch.setattr(
        collect.subprocess, "run", lambda cmd, **kwargs: log["git"].append(cmd[1])
    )

    def go(fetched):
        monkeypatch.setattr(collect, "fetch_window", lambda *a: fetched)
        assert collect.main() == 0
        return log

    return go


def test_cross_check_skipped_when_nothing_is_new(run):
    """매시간 24 회 중 23 회가 이 경로다. 교차검증 소스를 그만큼 칠 이유가 없다."""
    log = run([(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)])
    assert log["cross_check"] == 0
    assert log["git"] == []


def test_new_fixing_is_cross_checked_and_rebased_before_push(run):
    """rebase 가 빠지면 무관한 머지 하나가 수집을 실패시킨다 — 지운 collect.sh 의 역할."""
    log = run([(date(2026, 9, 18), 1380.3), (date(2026, 9, 21), 1383.8)])
    assert log["cross_check"] == 1
    assert log["git"] == ["add", "commit", "pull", "push"]
