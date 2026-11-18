import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { useV2Products } from "../hooks/useV2Products";
import { useFavorites } from "../hooks/useFavorites";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2FavoritesPage() {
  const { items, countries, categories } = useV2Products();
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const { favoriteIds } = useFavorites();

  const favoriteProducts = items.filter((p) => favoriteIds.includes(p.id));

  useV2Seo({
    title: "찜한 상품 | TourStream",
    description: "내가 찜한 여행 상품을 모아보세요.",
    robots: "noindex, follow",
  });

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-5">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; 찜한 상품
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">찜한 상품</h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-slate-400">
          상품 <b className="font-bold text-slate-900">{favoriteProducts.length.toLocaleString("ko-KR")}</b>개 · 이 브라우저에만 저장돼요
        </p>
      </section>

      <ProductBrowser
        products={favoriteProducts}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder="찜한 상품 안에서 검색"
        emptyText="아직 찜한 상품이 없어요. 상품 화면에서 하트를 눌러 보세요."
      />
    </div>
  );
}
