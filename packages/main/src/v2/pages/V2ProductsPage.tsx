import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCardV2 } from "../components/ProductCardV2";
import { useV2Products } from "../hooks/useV2Products";
import { Search } from "lucide-react";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2ProductsPage() {
  const { items, loading } = useV2Products();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKeyword = searchParams.get("q") || "";
  const [keyword, setKeyword] = useState(queryKeyword);
  const [sort, setSort] = useState<"popular" | "price-low" | "price-high">("popular");

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

  useV2Seo({
    title: keyword.trim() ? `"${keyword.trim()}" 검색 결과 | TourStream` : "전체 상품 | TourStream",
    description: keyword.trim()
      ? `"${keyword.trim()}" 관련 여행 상품 검색 결과입니다.`
      : "TourStream 전체 여행 상품 목록 페이지입니다.",
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
        <p className="text-slate-500 text-base">피그마 리디자인 기준의 상품 카드/그리드 레이아웃입니다.</p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="상품명, 지역명으로 검색"
            className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-cyan-400"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "popular" | "price-low" | "price-high")}
          className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none"
        >
          <option value="popular">인기순</option>
          <option value="price-low">가격 낮은순</option>
          <option value="price-high">가격 높은순</option>
        </select>
      </div>

      {loading && <div className="text-sm text-slate-500 mb-4">상품 불러오는 중...</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-slate-500 mb-4">조건에 맞는 상품이 없습니다.</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <ProductCardV2 key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
