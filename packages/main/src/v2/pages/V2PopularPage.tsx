import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ProductCardV2 } from "../components/ProductCardV2";
import { ChevronRight, Loader2 } from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2PopularPage() {
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const { items } = useV2Products();

  const flaggedPopular = items.filter((p) => p.isPopular);
  const popularProducts = (flaggedPopular.length > 0 ? flaggedPopular : items)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);
  const hasMore = visibleCount < popularProducts.length;

  useV2Seo({
    title: "인기 상품 전체보기 | TourStream",
    description: "지금 가장 인기 있는 여행 상품을 모아봤습니다.",
    canonicalPath: "/popular",
    ogType: "website",
    ogImage: popularProducts[0]?.image,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "인기 상품 전체보기",
        url: "https://tourstream.kr/popular",
      },
    ],
  });

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 8);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 md:py-12">
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-8">
        <Link to="/" className="hover:text-cyan-600 transition-colors">
          홈
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-bold">인기 상품 전체보기</span>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">지금 가장 인기 있는 상품</h1>
        <p className="text-slate-500 text-base">수많은 여행자들이 선택한 베스트셀러 상품입니다.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {popularProducts.slice(0, visibleCount).map((product) => (
          <ProductCardV2 key={product.id} product={product} />
        ))}
      </div>
      {popularProducts.length === 0 && <div className="text-sm text-slate-500 mt-6">노출할 인기 상품이 없습니다.</div>}

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full shadow-sm hover:bg-slate-50 hover:text-cyan-600 disabled:opacity-70 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span>상품 불러오는 중...</span>
              </>
            ) : (
              "더 많은 상품 보기"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
