import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { looseMatches } from "../brand";

/** 주소에서 찾을 만한 낱말을 뽑는다. /region/osaka-castle → ["osaka","castle"] */
function wordsFromPath(pathname: string): string[] {
  const SKIP = new Set([
    "region", "country", "category", "product", "destination", "products",
    "popular", "favorites", "coupons", "flights", "event", "guide", "v2", "index.html",
  ]);
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // 주소에 깨진 글자가 있어도 화면은 떠야 한다
  }
  return decoded
    .toLowerCase()
    .split(/[/\-_+.%]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !SKIP.has(w) && !/^\d+$/.test(w))
    .slice(0, 4);
}

export default function V2NotFoundPage() {
  const { pathname } = useLocation();
  const { items, countries } = useV2Products();

  useV2Seo({
    title: "페이지를 찾을 수 없습니다 | TourStream",
    description: "요청하신 페이지를 찾을 수 없습니다.",
    canonicalPath: "/404",
    ogType: "website",
    // 정적 호스팅이라 실제 404 상태코드를 줄 수 없어서, 검색엔진이 soft 404로 잡지 않도록 noindex 처리
    robots: "noindex, follow",
  });

  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const words = useMemo(() => wordsFromPath(pathname), [pathname]);

  /*
    막다른 길을 만들지 않는다.
    /region/osakaa 처럼 오타로 들어와도 주소의 낱말로 비슷한 상품을 찾아 보여 준다.
  */
  const suggestions = useMemo(
    () => looseMatches(items, words, countryNameById, 6),
    [items, words, countryNameById],
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto px-5 md:px-6 py-14 md:py-20">
      <div className="text-center">
        <div className="text-6xl font-black text-slate-200 mb-4">404</div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-slate-500 mb-8">주소가 잘못되었거나, 삭제되었거나, 이동된 페이지일 수 있어요.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="px-6 py-3 rounded-full bg-brand text-white text-sm font-bold hover:opacity-90 transition-opacity">
            홈으로 가기
          </Link>
          <Link
            to="/products"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full border border-slate-200 text-sm font-bold text-slate-700 hover:border-slate-300 transition-colors"
          >
            <Search className="w-4 h-4" />
            전체 상품 보기
          </Link>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-14">
          <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">
            혹시 이걸 찾으셨나요?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
            {suggestions.map((p) => (
              <ProductCard key={p.id} product={p} countryName={countryNameById.get(p.countryId)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
