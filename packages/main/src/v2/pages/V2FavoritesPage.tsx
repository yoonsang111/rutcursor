import React from "react";
import { ProductListRow } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import { useFavorites } from "../hooks/useFavorites";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2FavoritesPage() {
  const { items, countryById } = useV2Products();
  const { favoriteIds } = useFavorites();

  const favoriteProducts = items.filter((p) => favoriteIds.includes(p.id));

  useV2Seo({
    title: "찜한 상품 | TourStream",
    description: "내가 찜한 여행 상품을 모아보세요.",
    robots: "noindex, follow",
  });

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20 px-6">
      <section className="py-8 md:py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">찜한 상품</h1>
        <p className="text-sm text-slate-500 mt-1">이 브라우저에 저장된 찜 목록이에요.</p>
      </section>

      <section className="pb-8">
        <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
          {favoriteProducts.map((p) => (
            <ProductListRow key={p.id} product={p} countryName={countryById.get(p.countryId)?.name} />
          ))}
        </div>
        {favoriteProducts.length === 0 && (
          <div className="text-sm text-slate-500 py-12 text-center">아직 찜한 상품이 없어요. 상품 페이지에서 하트 버튼을 눌러보세요.</div>
        )}
      </section>
    </div>
  );
}
