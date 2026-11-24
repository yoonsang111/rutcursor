"""용아맥(용산아이파크몰 IMAX) 2인 좌석 순위 계산.

좌석 번호가 아니라 화면에 그려진 실제 좌표(x)로 중앙을 계산하므로
통로 때문에 번호가 건너뛰어도 정확하다. 브라우저와 무관한 순수 로직이라
단독으로 테스트할 수 있다.

점수 (낮을수록 좋음)
    score = W_CENTER * (중앙 벗어남 비율) ** CENTER_POWER
          + W_ROW    * (선호 열 범위에서 벗어난 줄 수 / 전체 줄 수)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

# ── 용아맥 기본값 ────────────────────────────────────────────────
PEOPLE = 2
PREFERRED_ROWS = ("J", "K")   # 이 범위 안은 행 감점 0
TIE_BREAK_BACK = True         # 동점이면 뒷줄 우선 (대형 화면은 살짝 뒤가 편함)
W_CENTER = 0.7                # 중앙 우선
W_ROW = 0.3
CENTER_POWER = 1.5            # 중앙에서 멀어질수록 감점이 가파르게 커짐
AISLE_GAP_RATIO = 1.5         # 좌석 간격이 평소의 1.5배 넘으면 통로로 판단


@dataclass(frozen=True)
class Seat:
    id: str        # 예: "K21"
    row: str       # 예: "K"
    x: float       # 화면상 좌석 중심 x 좌표
    free: bool     # 예매 가능 여부 (판매됨·장애인석·커플석 등은 False)


@dataclass(frozen=True)
class Block:
    seat_ids: tuple[str, ...]
    row: str
    score: float

    @property
    def label(self) -> str:
        return f"{self.seat_ids[0]}-{self.seat_ids[-1]}" if len(self.seat_ids) > 1 else self.seat_ids[0]


def _median(values: list[float]) -> float:
    s = sorted(values)
    return s[len(s) // 2] if s else 0.0


def rank_blocks(
    seats: Iterable[Seat],
    people: int = PEOPLE,
    preferred_rows: tuple[str, ...] = PREFERRED_ROWS,
    w_center: float = W_CENTER,
    w_row: float = W_ROW,
    center_power: float = CENTER_POWER,
    tie_break_back: bool = TIE_BREAK_BACK,
    screen_center_x: float | None = None,
    only_free: bool = True,
) -> list[Block]:
    """선택 가능한 연석 묶음을 좋은 순서대로 반환한다."""
    seats = list(seats)
    if not seats:
        return []

    xs = [s.x for s in seats]
    center = screen_center_x if screen_center_x is not None else (min(xs) + max(xs)) / 2
    half_width = max((max(xs) - min(xs)) / 2, 1e-9)

    by_row: dict[str, list[Seat]] = {}
    for s in seats:
        by_row.setdefault(s.row, []).append(s)
    row_order = sorted(by_row, key=lambda r: (len(r), r))  # A..Z, AA.. 스크린 가까운 순
    n_rows = len(row_order)
    pref_idx = [row_order.index(r) for r in preferred_rows if r in row_order]
    if not pref_idx:  # 선호 열이 배치도에 없으면 가운데 줄을 기준으로
        pref_idx = [n_rows // 2]
    lo, hi = min(pref_idx), max(pref_idx)

    blocks: list[tuple[tuple, Block]] = []
    for ri, row in enumerate(row_order):
        line = sorted(by_row[row], key=lambda s: s.x)
        step = _median([b.x - a.x for a, b in zip(line, line[1:])])
        row_dist = lo - ri if ri < lo else ri - hi if ri > hi else 0
        row_pen = row_dist / n_rows

        for i in range(len(line) - people + 1):
            blk = line[i : i + people]
            if only_free and not all(s.free for s in blk):
                continue
            if step and any(b.x - a.x > step * AISLE_GAP_RATIO for a, b in zip(blk, blk[1:])):
                continue  # 통로를 사이에 둔 묶음 제외
            mid = sum(s.x for s in blk) / people
            center_pen = (abs(mid - center) / half_width) ** center_power
            score = w_center * center_pen + w_row * row_pen
            # 동점 처리: 점수 → 선호 범위와의 거리 → 뒷줄/앞줄 → 중앙 거리
            tie = (round(score, 9), row_dist, -ri if tie_break_back else ri, abs(mid - center))
            blocks.append((tie, Block(tuple(s.id for s in blk), row, score)))

    blocks.sort(key=lambda t: t[0])
    return [b for _, b in blocks]


# ── 미리보기용 가상 배치 ─────────────────────────────────────────
def demo_layout(rows: str = "ABCDEFGHIJKLMNOP", seats_per_row: int = 42,
                aisles: tuple[int, ...] = (8, 34)) -> list[Seat]:
    """실제 용아맥 배치가 아닌 '비슷한 규모'의 가상 배치. 로직 확인용."""
    out = []
    for r in rows:
        for c in range(1, seats_per_row + 1):
            x = c + sum(1.0 for a in aisles if c > a)
            out.append(Seat(f"{r}{c}", r, float(x), True))
    return out


if __name__ == "__main__":
    for i, b in enumerate(rank_blocks(demo_layout())[:15], 1):
        print(f"{i:2d}. {b.label:<10} score={b.score:.4f}")
