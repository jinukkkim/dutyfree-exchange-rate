"""main() 의 분기 — 네트워크와 git 을 걷어내고 호출만 센다.

매시간 돌기 시작하면서 생긴 두 가지를 고정한다. 새 고시가 없으면 남의 상용
사이트를 치지 않는다는 것, 그리고 push 앞에 rebase 가 선다는 것. 여기에 ECOS 가
처음 올라온 시각이 smbs 와 따로 기록된다는 것.
"""

from datetime import date

import pytest

from dfx import collect
from dfx.store import (
    Row,
    ReferenceRate,
    read_jpy,
    read_rates,
    read_reference_rates,
    read_seen,
    write_jpy,
    write_rates,
    write_seen,
)

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
    jpy_path = tmp_path / "jpy.csv"
    write_jpy(jpy_path, {date(2026, 9, 18): 950.5})
    monkeypatch.setattr(collect, "JPY_PATH", jpy_path)
    reference_path = tmp_path / "reference.csv"
    monkeypatch.setattr(collect, "REFERENCE_PATH", reference_path)
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

    def go(fetched, ecos_rows=None, jpy_rows=None, reference_rows=()):
        monkeypatch.setattr(collect.smbs, "fetch_window", lambda *a: fetched)
        monkeypatch.setattr(collect, "fetch_ecos", lambda *a: ecos_rows)
        monkeypatch.setattr(collect, "fetch_jpy", lambda *a: jpy_rows)
        monkeypatch.setattr(collect.reference, "fetch", lambda *a: list(reference_rows))
        assert collect.main() == 0
        log["seen"] = read_seen(seen_path)
        log["jpy"] = read_jpy(jpy_path)
        log["reference"] = read_reference_rates(reference_path)
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


def test_jpy_arriving_later_is_committed_alone(run):
    """재정환율은 달러보다 늦게 올라온다. 엔 값만 새로 들어와도 커밋해야 /ja 가 따라온다."""
    log = run(
        [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)],
        jpy_rows=[(date(2026, 9, 18), 950.5), (date(2026, 9, 21), 948.2)],
    )
    assert log["jpy"] == {date(2026, 9, 18): 950.5, date(2026, 9, 21): 948.2}
    assert log["cross_check"] == 0
    assert log["cmds"][1] == ["git", "commit", "-m", "data(collect): jpy through 2026-09-21"]


def test_jpy_unavailable_does_not_block_collection(run):
    log = run([(date(2026, 9, 18), 1380.3), (date(2026, 9, 21), 1383.8)], jpy_rows=None)
    assert log["jpy"] == {date(2026, 9, 18): 950.5}
    assert date(2026, 9, 21) in log["rates"]
    assert not any(p.endswith("jpy.csv") for p in log["cmds"][0][2:])


def test_jpy_out_of_range_row_is_dropped_alone(monkeypatch, capsys):
    """이상치 한 행이 같은 응답의 정상 행까지 막으면, 그 행이 10일 창에서 빠질 때까지 엔 값이 멈춘다."""
    rows = [(date(2026, 9, 18), 9.505), (date(2026, 9, 21), 948.2)]
    monkeypatch.setattr(collect.smbs, "fetch_window", lambda *a: rows)
    assert collect.fetch_jpy(None, date(2026, 9, 11), date(2026, 9, 21)) == [(date(2026, 9, 21), 948.2)]
    assert "jpy out of range" in capsys.readouterr().err


def test_rates_and_jpy_changed_together_are_one_commit(run, capsys):
    log = run(
        [(date(2026, 9, 18), 1380.3), (date(2026, 9, 21), 1383.8)],
        jpy_rows=[(date(2026, 9, 21), 948.2)],
    )
    added = log["cmds"][0][2:]
    assert any(p.endswith("rates.csv") for p in added)
    assert any(p.endswith("jpy.csv") for p in added)
    assert log["cmds"][1] == ["git", "commit", "-m", "data(collect): rates through 2026-09-21"]
    assert "jpy updated" in capsys.readouterr().out


def test_reference_only_changes_are_committed_and_identical_retry_is_noop(run):
    fetched = [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)]
    row = ReferenceRate(date(2026, 9, 21), "CNY", 200.123456789, "ecb")
    log = run(fetched, reference_rows=[row])
    assert log["reference"] == {(row.fixing_date, "CNY"): row}
    assert log["cmds"][0][2:] == [str(collect.REFERENCE_PATH)]
    assert "reference rates through 2026-09-21" in log["cmds"][1][-1]
    assert log["cross_check"] == 0
    log["git"].clear()
    run(fetched, reference_rows=[row])
    assert log["git"] == []


def test_partial_reference_update_preserves_other_currencies(run):
    fetched = [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)]
    cny = ReferenceRate(date(2026, 9, 18), "CNY", 200, "ecb")
    twd = ReferenceRate(date(2026, 9, 18), "TWD", 40, "smbs")
    run(fetched, reference_rows=[cny, twd])
    corrected = cny._replace(krw_per_unit=201)
    log = run(fetched, reference_rows=[corrected])
    assert log["reference"] == {(cny.fixing_date, "CNY"): corrected, (twd.fixing_date, "TWD"): twd}


@pytest.mark.parametrize("correcting", [False, True])
def test_reference_commit_date_comes_from_changed_rows_only(run, correcting):
    fetched = [(date(2026, 9, 17), 1368.3), (date(2026, 9, 18), 1380.3)]
    older = ReferenceRate(date(2026, 9, 17), "CNY", 200, "ecb")
    latest = ReferenceRate(date(2026, 9, 21), "HKD", 180, "ecb")
    run(fetched, reference_rows=([older] if correcting else []) + [latest])
    revised = older._replace(krw_per_unit=201)
    log = run(fetched, reference_rows=[revised, latest])
    assert log["cmds"][-3] == ["git", "commit", "-m", "data(collect): reference rates through 2026-09-17"]
    assert log["reference"][older.fixing_date, "CNY"] == revised
