"""용아맥 2인 좌석 선점 도우미 (결제는 직접).

흐름
  1. 예매 브라우저(로그인 유지)를 띄우고 직접 로그인
  2. 감시 브라우저(로그아웃)가 POLL_SEC 간격으로 시간표 확인
  3. 오픈 감지 → 감시 중지 → 예매 브라우저에서 회차·인원 선택
  4. 접속 대기열이 있으면 새로고침 없이 그대로 대기
  5. 좌석 배치도를 읽어 seat_rank 순위대로 빈 연석 2개를 선점
  6. 알림 → 결제는 본인이 직접

지키는 선 (의도적으로 넣지 않은 기능)
  - 봇 탐지 회피(스텔스·캡차 우회·프록시 교체) 없음
  - 대기열 우회·다중 탭·다중 계정 없음
  - 감시 간격 30초 미만 금지, 결제 자동화 없음

사용
  python cgv_imax.py --dry-run   # 선점하지 않고 1~3순위만 표시 (셀렉터 점검용)
  python cgv_imax.py --now       # 감시 생략, 이미 열린 회차로 바로 진행
  python cgv_imax.py             # 오픈 감시부터 전체 실행
"""
from __future__ import annotations

import argparse
import os
import sys
import time

from seat_rank import PEOPLE, Seat, rank_blocks

# ── 설정 ─────────────────────────────────────────────────────────
TARGET_URL = "https://www.cgv.co.kr/"   # TODO: 용산아이파크몰 · 원하는 날짜 시간표 URL
SHOWTIME_TEXT = "19:30"                 # 원하는 회차 시작 시각
POLL_SEC = 60                           # 30 미만으로 설정하면 30으로 올림
KEEPALIVE_SEC = 600                     # 로그인 세션 확인 주기
QUEUE_TIMEOUT_MIN = 40
MAX_PICK_ATTEMPTS = 5                   # 선점 실패 시 다음 순위로 넘어가는 최대 횟수
PROFILE_DIR = os.path.join(os.path.dirname(__file__), ".cgv_profile")

# ── 셀렉터 (⚠️ CGV 실제 구조를 F12로 확인해서 수정) ───────────────
SEL_LOGGED_IN = "text=로그아웃"                    # 로그인 상태에서만 보이는 요소
SEL_SHOWTIME = lambda t: f"text={t}"              # 회차 버튼
SEL_PEOPLE = lambda n: f"[data-count='{n}']"      # 인원 선택 버튼 (일반 n명)
SEL_QUEUE = "text=접속 대기"                       # 대기열 화면 표식
SEL_SEAT_MAP = "#seat_map"                        # 좌석 배치도 컨테이너
SEL_ALL_SEATS = "#seat_map [data-seat]"           # 좌석 요소 전체
SEAT_ID_ATTR = "data-seat"                        # 좌석 번호가 든 속성 (예: K21)
SEAT_ROW_ATTR = "data-row"                        # 행 속성 (없으면 좌석 번호 앞 글자 사용)
UNAVAILABLE_CLASSES = ["reserved", "disabled", "handicap", "couple"]  # 선택 불가 class
SELECTED_CLASS = "selected"                       # 선택 완료 시 붙는 class
SEAT_FRAME = None                                 # 배치도가 iframe 안이면 그 셀렉터

TG_TOKEN, TG_CHAT = os.getenv("TG_TOKEN"), os.getenv("TG_CHAT")


def notify(msg: str) -> None:
    print("\a" + msg, flush=True)
    if TG_TOKEN and TG_CHAT:
        try:
            import requests
            requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                          data={"chat_id": TG_CHAT, "text": msg}, timeout=5)
        except Exception as e:  # 알림 실패가 예매 흐름을 막지 않도록
            print(f"(텔레그램 알림 실패: {e})")


def is_logged_in(page) -> bool:
    return page.locator(SEL_LOGGED_IN).count() > 0


def seat_scope(page):
    return page.frame_locator(SEAT_FRAME) if SEAT_FRAME else page


# ── 좌석 배치도 읽기 ─────────────────────────────────────────────
READ_SEATS_JS = """(els, cfg) => els.map(e => {
  const r = e.getBoundingClientRect();
  const id = e.getAttribute(cfg.idAttr) || '';
  const row = e.getAttribute(cfg.rowAttr) || id.replace(/[0-9]+$/, '');
  const bad = cfg.bad.some(c => e.classList.contains(c));
  return { id, row, x: r.x + r.width / 2, free: !bad };
})"""


def read_seats(page) -> list[Seat]:
    scope = seat_scope(page)
    raw = scope.locator(SEL_ALL_SEATS).evaluate_all(
        READ_SEATS_JS,
        {"idAttr": SEAT_ID_ATTR, "rowAttr": SEAT_ROW_ATTR, "bad": UNAVAILABLE_CLASSES},
    )
    return [Seat(r["id"], r["row"], r["x"], r["free"]) for r in raw if r["id"]]


def seat_el(page, seat_id: str):
    return seat_scope(page).locator(f"[{SEAT_ID_ATTR}='{seat_id}']").first


def highlight(page, blocks) -> None:
    colors = ["red", "orange", "gold"]
    for rank, b in enumerate(blocks[:3]):
        for sid in b.seat_ids:
            seat_el(page, sid).evaluate(
                f"e => {{ e.style.outline='3px solid {colors[rank]}'; e.title='{rank + 1}순위'; }}")


# ── 대기열 ──────────────────────────────────────────────────────
def wait_through_queue(page) -> None:
    """대기열이 보이면 새로고침 없이 그대로 기다린다."""
    if page.locator(SEL_QUEUE).count() == 0:
        return
    notify("⏳ 접속 대기열 진입 — 창을 닫거나 새로고침하지 마세요")
    page.wait_for_selector(SEL_SEAT_MAP, timeout=QUEUE_TIMEOUT_MIN * 60_000)
    notify("✅ 대기열 통과")


# ── 좌석 선점 ───────────────────────────────────────────────────
def try_pick(page, block) -> bool:
    """한 묶음을 클릭하고 실제로 선택됐는지 확인한다."""
    page.once("dialog", lambda d: d.accept())  # '이미 선택된 좌석' 등 알림창 닫기
    for sid in block.seat_ids:
        el = seat_el(page, sid)
        cls = el.get_attribute("class") or ""
        if SELECTED_CLASS in cls.split():
            continue  # 첫 클릭으로 옆자리가 같이 선택되는 사이트 대비
        el.click()
    page.wait_for_timeout(500)
    return all(SELECTED_CLASS in (seat_el(page, sid).get_attribute("class") or "").split()
               for sid in block.seat_ids)


def clear_selection(page, block) -> None:
    for sid in block.seat_ids:
        el = seat_el(page, sid)
        if SELECTED_CLASS in (el.get_attribute("class") or "").split():
            el.click()


def pick_best(page, dry_run: bool) -> None:
    seat_scope(page).locator(SEL_ALL_SEATS).first.wait_for()
    tried: set[tuple[str, ...]] = set()

    for attempt in range(1, MAX_PICK_ATTEMPTS + 1):
        ranked = [b for b in rank_blocks(read_seats(page), people=PEOPLE) if b.seat_ids not in tried]
        if not ranked:
            notify("😢 조건에 맞는 2연석이 없습니다 — 직접 확인하세요")
            return
        print("현재 순위:", ", ".join(f"{i + 1}.{b.label}" for i, b in enumerate(ranked[:5])))
        highlight(page, ranked)

        if dry_run:
            notify(f"[dry-run] 1순위 {ranked[0].label} (선점 안 함) — 표시된 테두리 확인")
            return

        best = ranked[0]
        if try_pick(page, best):
            notify(f"🎬 {best.label} 선점 완료! 결제 제한시간 안에 직접 결제하세요")
            return
        print(f"  {attempt}차 시도 {best.label} 실패 → 다음 순위")
        clear_selection(page, best)
        tried.add(best.seat_ids)

    notify("⚠️ 선점 시도 한도 초과 — 남은 좌석은 직접 선택하세요")


# ── 메인 ────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description="용아맥 2인 좌석 선점 도우미")
    ap.add_argument("--dry-run", action="store_true", help="선점하지 않고 순위만 표시")
    ap.add_argument("--now", action="store_true", help="오픈 감시 생략")
    args = ap.parse_args()
    poll = max(POLL_SEC, 30)

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        user = p.chromium.launch_persistent_context(PROFILE_DIR, headless=False)
        upage = user.pages[0] if user.pages else user.new_page()
        upage.goto("https://www.cgv.co.kr/")
        if not is_logged_in(upage):
            input("예매 브라우저에서 직접 로그인한 뒤 Enter를 누르세요...")

        if not args.now:
            watcher = p.chromium.launch(headless=True)
            wpage = watcher.new_page()
            last_keepalive = time.time()
            print(f"오픈 감시 시작 ({poll}초 간격)")
            while True:
                try:
                    wpage.goto(TARGET_URL)
                    if wpage.locator(SEL_SHOWTIME(SHOWTIME_TEXT)).count() > 0:
                        break
                except Exception as e:
                    print(f"  조회 오류(무시하고 계속): {e}")
                if time.time() - last_keepalive > KEEPALIVE_SEC:
                    upage.reload()
                    if not is_logged_in(upage):
                        notify("⚠️ CGV 로그인 풀림 — 예매 브라우저에서 다시 로그인하세요")
                    last_keepalive = time.time()
                time.sleep(poll)
            watcher.close()  # 오픈 후에는 감시 중지
            notify(f"🔔 {SHOWTIME_TEXT} 회차 오픈 감지 — 진입합니다")

        upage.bring_to_front()
        upage.goto(TARGET_URL)
        upage.locator(SEL_SHOWTIME(SHOWTIME_TEXT)).first.click()
        wait_through_queue(upage)
        upage.locator(SEL_PEOPLE(PEOPLE)).first.click()
        wait_through_queue(upage)
        pick_best(upage, args.dry_run)

        input("결제를 마친 뒤 Enter를 누르면 종료합니다...")
        user.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
