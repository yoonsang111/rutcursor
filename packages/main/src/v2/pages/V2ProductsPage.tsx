import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductListRow, ProductListRowSkeleton } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import { Loader2, Search } from "lucide-react";
import { useV2Seo } from "../hooks/useV2Seo";

const PAGE_SIZE = 20;

export default function V2ProductsPage() {
  const { items, countries, loading } = useV2Products();
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKeyword = searchParams.get("q") || "";
  const [keyword, setKeyword] = useState(queryKeyword);
  const [sort, setSort] = useState<"popular" | "price-low" | "price-high">("popular");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  React.useEffect(() => {
    setKeyword(queryKeyword);
  }, [queryKeyword]);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    const trimmed = value.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true });
      return;
    }
    setSearchParams({}, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = q
      ? items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.region.toLowerCase().includes(q),
        )
      : [...items];

    if (sort === "popular") {
      list.sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);
    } else if (sort === "price-low") {
      list.sort((a, b) => {
        const ap = a.price > 0 ? a.price : Number.MAX_SAFE_INTEGER;
        const bp = b.price > 0 ? b.price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [items, keyword, sort]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [keyword, sort]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const showSkeleton = loading && visibleProducts.length === 0;
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setIsLoadingMore(false);
    }, 300);
  };

  useV2Seo({
    // 검색어가 없을 때의 값은 정적 셸과 동일해야 한다 (다르면 셸 문구가 무효가 됨)
    title: keyword.trim() ? `"${keyword.trim()}" 검색 결과 | TourStream` : "해외여행 입장권·교통패스 전체 상품 | TourStream",
    description: keyword.trim()
      ? `"${keyword.trim()}" 관련 여행 상품 검색 결과입니다.`
      : "일본·대만·싱가포르 등 해외여행 입장권, 교통패스, 전망대, 테마파크 상품을 한눈에. 클룩·마이리얼트립·KKday 등 제휴사별 가격을 비교하세요.",
    canonicalPath: keyword.trim() ? `/products?q=${encodeURIComponent(keyword.trim())}` : "/products",
    ogType: "website",
    ogImage: filtered[0]?.image,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: keyword.trim() ? `"${keyword.trim()}" 검색 결과` : "전체 상품",
        url: keyword.trim()
          ? `https://tourstream.kr/products?q=${encodeURIComponent(keyword.trim())}`
          : "https://tourstream.kr/products",
      },
    ],
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">전체 상품</h1>
        <p className="text-slate-500 text-base">파트너사 가격을 한눈에 비교해보세요.</p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <label htmlFor="product-search" className="sr-only">
            상품 검색
          </label>
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="product-search"
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="예: 오사카, 주유패스…"
            className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "popular" | "price-low" | "price-high")}
          aria-label="정렬 기준"
          className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          <option value="popular">인기순</option>
          <option value="price-low">가격 낮은순</option>
          <option value="price-high">가격 높은순</option>
        </select>
      </div>

      {loading && !showSkeleton && <div className="text-sm text-slate-500 mb-4">상품 불러오는 중...</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-slate-500 mb-4">조건에 맞는 상품이 없습니다.</div>}
      <div aria-busy={loading} className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
        {showSkeleton
          ? Array.from({ length: PAGE_SIZE }, (_, i) => <ProductListRowSkeleton key={i} />)
          : visibleProducts.map((product) => (
              <ProductListRow key={product.id} product={product} countryName={countryNameById.get(product.countryId)} />
            ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full shadow-sm hover:bg-slate-50 hover:text-brand disabled:opacity-70 transition-all duration-300"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                <span>상품 불러오는 중...</span>
              </>
            ) : (
              `더 많은 상품 보기 (${filtered.length - visibleCount}개 남음)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
