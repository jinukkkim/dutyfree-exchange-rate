"""main() 의 분기 — 네트워크와 git 을 걷어내고 호출만 센다.

매시간 돌기 시작하면서 생긴 두 가지를 고정한다. 새 고시가 없으면 남의 상용
사이트를 치지 않는다는 것, 그리고 push 앞에 rebase 가 선다는 것. 여기에 ECOS 가
처음 올라온 시각이 smbs 와 따로 기록된다는 것.
"""

from datetime import date

import pytest

from dfx import collect
from dfx.store import Row, read_rates, read_seen, write_rates, write_seen

EXISTING = [
    Row(date(2026, 9, 17), 1368.3, "MAR", "smbs+ssgdfs", "2026-09-17T09:00:12+09:00"),
    Row(date(2026, 9, 18), 1380.3, "MAR", "smbs+ssgdfs", "2026-09-18T09:00:09+09:00"),
]


@pytest.fixture
def run(tmp_path, monkeypatch):
    path = tmp_path / "rates.csv"
    write_rates(path, EXISTING)
    monkeypatch.setattr(collect, "RATES_PATH", path)
    seen_path = tmp_path / "ecos_seen.csv"
    write_seen(seen_path, {date(2026, 9, 18): (1380.3, "")})
    monkeypatch.setattr(collect, "ECOS_SEEN_PATH", seen_path)
    monkeypatch.setattr(collect, "today_kst", lambda: date(2026, 9, 21))

    log = {"cross_check": 0, "git": [], "cmds": []}

    def fake_cross_check(client, rows, today):
        log["cross_check"] += 1
        return True

    monkeypatch.setattr(collect, "cross_check", fake_cross_check)
    def fake_run(cmd, **kwargs):
        log["git"].append(cmd[1])
        log["cmds"].append(cmd)

    monkeypatch.setattr(collect.subprocess, "run", fake_run)

    def go(fetched, ecos_rows=None):
        monkeypatch.setattr(collect, "fetch_window", lambda *a: fetched)
        monkeypatch.setattr(collect, "fetch_ecos", lambda *a: ecos_rows)
        assert collect.main() == 0
        log["seen"] = read_seen(seen_path)
        log["rates"] = {row.fixing_date: row for row in read_rates(path)}
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


def test_ecos_arriving_later_is_stamped_and_committed_alone(run):
    """smbs 는 이미 있고 ECOS 만 이번 회차에 올라온 경우. 이 시각이 측정값이다."""
    log = run(
        [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)],
        ecos_rows=[(date(2026, 9, 18), 1380.3), (date(2026, 9, 21), 1383.8)],
    )
    assert log["seen"][date(2026, 9, 18)] == (1380.3, "")  # 처음 본 시각은 덮지 않는다
    rate, seen_at = log["seen"][date(2026, 9, 21)]
    assert rate == 1383.8 and seen_at.startswith("20")
    assert log["cross_check"] == 0
    assert log["git"] == ["add", "commit", "pull", "push"]


def test_ecos_unavailable_does_not_block_collection(run):
    log = run(
        [(date(2026, 9, 18), 1380.3), (date(2026, 9, 21), 1383.8)], ecos_rows=None
    )
    assert date(2026, 9, 21) not in log["seen"]
    assert log["git"] == ["add", "commit", "pull", "push"]


def test_ecos_mismatch_warns(run, capsys):
    run(
        [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)],
        ecos_rows=[(date(2026, 9, 18), 1380.5)],
    )
    assert "ecos mismatch on 2026-09-18" in capsys.readouterr().err


def test_same_run_arrival_gets_identical_timestamps(run):
    """ECOS 를 1차로 올릴지 가르는 경로. 같은 회차에 들어오면 두 시각이 문자 그대로 같아야 한다."""
    new = (date(2026, 9, 21), 1383.8)
    log = run([(date(2026, 9, 18), 1380.3), new], ecos_rows=[new])
    assert log["seen"][new[0]][1] == log["rates"][new[0]].collected_at
    added = log["cmds"][0][2:]
    assert any(p.endswith("rates.csv") for p in added)
    assert any(p.endswith("ecos_seen.csv") for p in added)
