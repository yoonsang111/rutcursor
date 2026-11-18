import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2ProductsPage() {
  const { items, countries, categories, loading } = useV2Products();
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";
  // 검색·정렬·필터·더 보기는 ProductBrowser 가 맡는다. 여기서는 SEO 문구에 쓸 값만 본다.
  const filtered = items;

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
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; 전체 상품
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">
          {keyword.trim() ? `"${keyword.trim()}" 검색 결과` : "전체 상품"}
        </h1>
      </section>

      <ProductBrowser
        products={items}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder="예: 오사카, 주유패스…"
        loading={loading}
      />
    </div>
  );
}
