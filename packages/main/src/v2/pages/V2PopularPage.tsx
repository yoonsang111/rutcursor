import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2PopularPage() {
  const { items, countries, categories, loading } = useV2Products();
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

  const flaggedPopular = items.filter((p) => p.isPopular);
  const popularProducts = (flaggedPopular.length > 0 ? flaggedPopular : items)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);

  useV2Seo({
    // 정적 셸과 동일하게 유지 (다르면 셸 문구가 무효가 됨)
    title: "인기 해외여행 입장권·패스 TOP | TourStream",
    description:
      "지금 가장 많이 조회된 해외여행 입장권, 교통패스, 테마파크 인기 상품을 확인하고 클룩·마이리얼트립·KKday 가격을 비교하세요.",
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

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-5">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; 인기 상품
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">인기 상품</h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-slate-400">
          상품 <b className="font-bold text-slate-900">{popularProducts.length.toLocaleString("ko-KR")}</b>개
        </p>
      </section>

      <ProductBrowser
        products={popularProducts}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder="인기 상품 안에서 검색"
        loading={loading}
        emptyText="보여 드릴 인기 상품이 없습니다."
      />
    </div>
  );
}
