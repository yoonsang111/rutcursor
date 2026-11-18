import React from "react";
import { Link } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import { Product } from "../data";
import { priceSpread, won } from "../brand";
import { useFavorites } from "../hooks/useFavorites";

interface ProductCardProps {
  product: Product;
  countryName?: string;
}

/**
 * 목록용 상품 카드. 사진이 위, 글이 아래.
 * 값은 "취소선 그은 최고가 → 빨간 할인율 → 굵은 최저가" 순서로 읽히게 둔다.
 */
export function ProductCard({ product, countryName }: ProductCardProps) {
  const spread = priceSpread(product);
  const hasRating = product.rating > 0 && product.reviews > 0;
  const place = [countryName, product.region].filter(Boolean).join(" · ");
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  return (
    // 하트는 링크 '안'이 아니라 '옆'에 둔다. 링크 안에 버튼을 넣으면 눌렀을 때 상품 화면으로 넘어가 버린다.
    <div className="group relative">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative w-full aspect-[16/11] rounded-lg overflow-hidden bg-slate-100">
          <img
            src={product.image}
            alt={product.name}
            width={320}
            height={220}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>

        <div className="mt-2 flex items-center gap-1 min-h-[21px]">
          {spread.sellerCount > 0 && (
            <span className="inline-flex items-center h-[21px] px-[7px] rounded text-[11px] font-medium bg-brand-tint text-brand">
              판매처 {spread.sellerCount}곳
            </span>
          )}
        </div>

        <div className="mt-1.5 h-[38px] text-[13.5px] md:text-[15px] md:h-[43px] font-medium leading-[1.42] tracking-[-0.03em] text-slate-900 line-clamp-2">
          {product.name}
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-[11.5px] md:text-xs text-slate-400 min-h-[17px]">
          {hasRating ? (
            <>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-900">{product.rating.toFixed(1)}</span>
              <span>({product.reviews.toLocaleString("ko-KR")})</span>
            </>
          ) : (
            place && <span>{place}</span>
          )}
        </div>

        {spread.low === undefined ? (
          <div className="mt-1.5 text-[13px] font-medium text-slate-400">가격 비교하기</div>
        ) : (
          <>
            <div className="mt-1.5 h-[17px] text-[11.5px] md:text-xs text-slate-300 line-through">
              {spread.high !== undefined ? won(spread.high) : ""}
            </div>
            <div className="flex items-baseline gap-1.5">
              {spread.off > 0 && <span className="text-[15px] md:text-[17px] font-bold text-[#FF3B46]">{spread.off}%</span>}
              <span className="text-[16.5px] md:text-[19px] font-bold tracking-[-0.035em] text-slate-900">{won(spread.low)}</span>
            </div>
          </>
        )}
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(product.id)}
        aria-pressed={favorite}
        aria-label={favorite ? `${product.name} 찜 빼기` : `${product.name} 찜하기`}
        title={favorite ? "찜 빼기" : "찜하기"}
        className="absolute right-1.5 top-1.5 w-9 h-9 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-[2px] text-white hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
      >
        <Heart className={`w-[18px] h-[18px] ${favorite ? "fill-[#FF3B46] text-[#FF3B46]" : "fill-transparent"}`} />
      </button>
    </div>
  );
}

/** 데이터가 오기 전 자리를 잡아 두는 회색 카드 (도착 시 화면 밀림 방지) */
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="w-full aspect-[16/11] rounded-lg bg-slate-100" />
      <div className="mt-2 h-[21px] w-[72px] rounded bg-slate-100" />
      <div className="mt-1.5 h-[38px] md:h-[43px] rounded bg-slate-100" />
      <div className="mt-1.5 h-[17px] w-2/5 rounded bg-slate-100" />
      <div className="mt-1.5 h-[17px] w-1/3 rounded bg-slate-100" />
      <div className="h-[25px] w-1/2 rounded bg-slate-100" />
    </div>
  );
}
