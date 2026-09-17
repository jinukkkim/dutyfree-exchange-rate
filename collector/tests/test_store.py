from datetime import date

from dfx.store import Row, method_for, read_rates, upsert, write_rates

A = Row(date(2026, 9, 16), 1353.3, "MAR", "smbs+ssgdfs", "2026-09-17T09:00:12+09:00")
B = Row(date(2026, 9, 17), 1368.3, "MAR", "smbs", "2026-09-18T09:00:09+09:00")


def test_roundtrip(tmp_path):
    path = tmp_path / "rates.csv"
    write_rates(path, [A, B])
    assert read_rates(path) == [A, B]


def test_read_missing_file_returns_empty(tmp_path):
    assert read_rates(tmp_path / "nope.csv") == []


def test_upsert_adds_new_rows_and_reports_count():
    merged, changed = upsert([A], [B])
    assert merged == [A, B]
    assert changed == 1


def test_upsert_is_noop_when_nothing_changed():
    """매일 10일치를 겹쳐 받으므로 대부분의 날은 변경이 0이어야 한다."""
    merged, changed = upsert([A, B], [A, B])
    assert merged == [A, B]
    assert changed == 0


def test_upsert_overwrites_corrected_value():
    corrected = B._replace(rate=1368.5)
    merged, changed = upsert([A, B], [corrected])
    assert merged == [A, corrected]
    assert changed == 1


def test_upsert_keeps_output_sorted():
    merged, _ = upsert([B], [A])
    assert [r.fixing_date for r in merged] == [A.fixing_date, B.fixing_date]


def test_method_switches_at_2027():
    """매매기준율 산출이 2027-01-01 부터 MAR 에서 TWAP 으로 바뀐다."""
    assert method_for(date(2026, 12, 31)) == "MAR"
    assert method_for(date(2027, 1, 1)) == "TWAP"


def test_upsert_ignores_collected_at_churn():
    """수집 시각만 갱신된 행은 변경이 아니다.

    이것이 없으면 changed 는 절대 0 이 되지 않고, collect.py 의
    "변경 없으면 커밋 생략" 분기가 죽은 코드가 된다.
    """
    reobserved = B._replace(collected_at="2026-09-19T09:00:04+09:00")
    merged, changed = upsert([A, B], [reobserved])
    assert changed == 0
    assert merged == [A, B]


def test_upsert_does_not_downgrade_verified_source():
    """교차검증이 하루 안 됐다고 과거의 검증 기록을 지우지 않는다."""
    # 두 소스로 검증된 행은 A 다 (source="smbs+ssgdfs").
    unverified = A._replace(source="smbs", collected_at="2026-09-19T09:00:04+09:00")
    merged, changed = upsert([A, B], [unverified])
    assert changed == 0
    assert merged[0].source == "smbs+ssgdfs"


def test_upsert_still_catches_a_corrected_rate():
    """값이 실제로 바뀌면 여전히 잡아야 한다 — churn 을 막느라 정정을 놓치면 안 된다."""
    corrected = B._replace(rate=1368.5, collected_at="2026-09-19T09:00:04+09:00")
    merged, changed = upsert([A, B], [corrected])
    assert changed == 1
    assert merged[1].rate == 1368.5
