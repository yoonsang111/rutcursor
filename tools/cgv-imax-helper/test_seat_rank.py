from seat_rank import Seat, demo_layout, rank_blocks


def test_center_of_preferred_row_is_first():
    top = rank_blocks(demo_layout())[0]
    assert top.row in ("J", "K")
    assert top.label in ("J21-J22", "K21-K22")


def test_center_beats_two_rows_off():
    labels = [b.label for b in rank_blocks(demo_layout())]
    # 같은 범위 안에서 한 칸 옆이, 두 줄 벗어난 정중앙보다 앞선다
    assert labels.index("K20-K21") < labels.index("M21-M22")


def test_taken_seats_are_skipped():
    seats = [Seat(s.id, s.row, s.x, s.id not in {"K21", "J21"}) for s in demo_layout()]
    for b in rank_blocks(seats)[:10]:
        assert "K21" not in b.seat_ids and "J21" not in b.seat_ids


def test_block_never_spans_aisle():
    for b in rank_blocks(demo_layout()):
        nums = [int(s[1:]) for s in b.seat_ids]
        assert not (8 in nums and 9 in nums)
        assert not (34 in nums and 35 in nums)


def test_tie_prefers_back_row():
    seats = [Seat("I1", "I", 1, True), Seat("I2", "I", 2, True),
             Seat("J1", "J", 1, True), Seat("J2", "J", 2, True),
             Seat("K1", "K", 1, True), Seat("K2", "K", 2, True),
             Seat("L1", "L", 1, True), Seat("L2", "L", 2, True)]
    labels = [b.label for b in rank_blocks(seats)]
    assert labels.index("L1-L2") < labels.index("I1-I2")
