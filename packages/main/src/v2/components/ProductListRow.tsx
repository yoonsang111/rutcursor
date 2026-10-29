import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { Product } from "../data";
import { trackEvent } from "../../utils/analytics";

interface ProductListRowProps {
  product: Product;
  countryName?: string;
  rank?: number;
}

export function ProductListRow({ product, countryName, rank }: ProductListRowProps) {
  // 판매 중지가 확인된 판매처는 목록 버튼에서 뺀다 (상세 페이지에서 '판매 중지'로 안내)
  const sortedLinks = product.partnerLinks.filter((l) => l.url && l.state !== "stopped").sort((a, b) => {
    const ap = a.price ?? Number.MAX_SAFE_INTEGER;
    const bp = b.price ?? Number.MAX_SAFE_INTEGER;
    return ap - bp;
  });
  const visibleLinks = sortedLinks.slice(0, 3);
  const extraCount = sortedLinks.length - visibleLinks.length;
  const hasRating = product.rating > 0 && product.reviews > 0;
  const locationLabel = [countryName, product.region].filter(Boolean).join(" · ");

  return (
    <div className="group flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-5 py-4 md:py-[18px] border-b border-slate-100 last:border-b-0">
      <Link to={`/product/${product.id}`} className="relative w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        <img src={product.image} alt={product.name} width={84} height={84} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {rank !== undefined && (
          <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-[10px] font-extrabold flex items-center justify-center">
            {rank}
          </span>
        )}
      </Link>

      <Link to={`/product/${product.id}`} className="flex-[1_1_calc(100%-96px)] md:flex-[0_1_240px] md:min-w-[140px] order-2 md:order-none">
        <div className="font-bold text-sm text-slate-900 leading-snug mb-1 line-clamp-2">{product.name}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {hasRating && (
            <span className="flex items-center gap-0.5 font-bold text-slate-700">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
              <span className="font-medium text-slate-400">({product.reviews.toLocaleString("ko-KR")})</span>
            </span>
          )}
          {locationLabel && <span>{locationLabel}</span>}
          {product.isRecommended && (
            <span className="text-[10px] font-extrabold text-brand bg-brand-tint px-1.5 py-0.5 rounded-full">에디터 픽</span>
          )}
        </div>
      </Link>

      <div className="relative flex-1 order-3 md:order-none w-full md:w-auto">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar py-0.5">
        {visibleLinks.length === 0 && (
          <span className="flex-shrink-0 text-xs font-medium text-slate-400 px-1 py-1.5">등록된 판매처 없음</span>
        )}
        {visibleLinks.map((link, idx) => {
          const isBest = idx === 0 && link.price !== undefined;
          return (
            <a
              key={`${link.name}-${idx}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("partner_link_click", {
                  partner: link.name,
                  product_id: product.id,
                  product_name: product.name,
                  price: link.price,
                  is_best_price: isBest,
                  placement: "list_row",
                });
              }}
              className={`flex-shrink-0 flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border text-xs min-w-[92px] transition-colors ${
                isBest ? "border-brand bg-brand-tint" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className={`font-bold ${isBest ? "text-brand" : "text-slate-400"}`}>{link.name}</span>
              <span className="font-extrabold text-slate-900">
                {link.priceDisplay || (link.price !== undefined ? `${link.price.toLocaleString()}원부터` : "가격 보기")}
              </span>
            </a>
          );
        })}
        {extraCount > 0 && (
          <span className="flex-shrink-0 flex items-center px-2 text-xs font-bold text-slate-400">+{extraCount}곳</span>
        )}
      </div>
      {visibleLinks.length >= 2 && (
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden" />
      )}
      </div>

      <Link
        to={`/product/${product.id}`}
        className="hidden md:flex flex-shrink-0 items-center gap-1 text-sm font-bold text-brand order-4 md:order-none"
      >
        비교하기 <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// 데이터가 오기 전 자리를 미리 잡아 두는 회색 줄 (도착 시 화면 밀림 방지). 바깥 class 는 ProductListRow 와 같게 유지할 것
export function ProductListRowSkeleton() {
  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-5 py-4 md:py-[18px] border-b border-slate-100 last:border-b-0">
      <div className="w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-xl flex-shrink-0 bg-slate-100" />

      <div className="flex-[1_1_calc(100%-96px)] md:flex-[0_1_240px] md:min-w-[140px] order-2 md:order-none">
        <div className="mb-1">
          <div className="h-[19px] rounded bg-slate-100" />
          <div className="h-[19px] w-3/5 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-2/5 rounded bg-slate-100" />
      </div>

      <div className="flex-1 order-3 md:order-none w-full md:w-auto">
        <div className="flex gap-2 py-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border border-slate-100 min-w-[92px]">
              <div className="h-4 rounded bg-slate-100" />
              <div className="h-4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:block flex-shrink-0 h-5 w-[72px] rounded bg-slate-100" />
    </div>
  );
}
