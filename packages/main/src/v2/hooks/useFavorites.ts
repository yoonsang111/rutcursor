import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "tourstream_v2_favorites";

/*
  회원가입 없이, 이 브라우저에만 저장되는 찜.

  목록 카드마다 이 훅을 쓰기 때문에 한 화면에 수십 개가 동시에 돌아간다.
  각자 따로 값을 들고 있으면 같은 상품이 두 군데(예: 주간 인기 + 최근 본 상품)에 있을 때
  한쪽만 하트가 켜지는 문제가 생긴다. 그래서 값은 이 파일에 한 벌만 두고
  useSyncExternalStore 로 모두가 같은 값을 보게 한다.
*/

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return EMPTY;
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 프라이빗 모드 등으로 저장이 막혀도 화면은 그대로 돌아가야 한다
  }
}

let snapshot: string[] = read();

function emit() {
  listeners.forEach((notify) => notify());
}

let bound = false;
function bindStorageOnce() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  // 다른 탭에서 찜한 것도 따라 들어온다
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    snapshot = read();
    emit();
  });
}

function subscribe(notify: () => void) {
  bindStorageOnce();
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/** 찜 넣기/빼기. 화면 어디서 눌러도 같은 값이 바뀐다. */
export function toggleFavorite(id: string) {
  if (!id) return;
  snapshot = snapshot.includes(id) ? snapshot.filter((x) => x !== id) : [...snapshot, id];
  write(snapshot);
  emit();
}

export function useFavorites() {
  const favoriteIds = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  return { favoriteIds, isFavorite, toggleFavorite };
}
