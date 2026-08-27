import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tourstream_v2_favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 저장 실패해도(프라이빗 모드 등) 앱이 죽지 않도록 무시
  }
}

// 회원가입 없이, 이 브라우저에만 저장되는 가벼운 찜 기능
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => readFavorites());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(readFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggleFavorite = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeFavorites(next);
      return next;
    });
  }, []);

  return { favoriteIds: ids, isFavorite, toggleFavorite };
}
