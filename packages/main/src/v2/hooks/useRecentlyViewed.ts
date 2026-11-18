import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tourstream_v2_recent";
const MAX = 20;

/*
  최근 본 상품. 회원가입 없이 이 브라우저에만 남긴다.
  쿠키가 아니라 localStorage 를 쓰는 이유: 쿠키는 페이지를 열 때마다 서버로 같이 날아가는데,
  최근 본 목록은 서버가 알 필요가 없는 정보다. 저장하는 값도 상품번호뿐이라 사람을 가리키지 않는다.
  로그인이 생기면 이 훅만 서버 저장으로 갈아끼우면 된다.
*/

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 프라이빗 모드 등으로 저장이 막혀도 화면은 그대로 돌아가야 한다
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => read());

  // 다른 탭에서 본 상품도 따라 들어오게 한다
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 본 상품을 맨 앞으로 올린다 (이미 있으면 자리만 옮긴다) */
  const record = useCallback((id: string) => {
    if (!id) return;
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      // 순서까지 같으면 저장도 다시 그리기도 하지 않는다
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev;
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setIds([]);
  }, []);

  return { recentIds: ids, record, clear };
}
