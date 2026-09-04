import React from "react";
import { useParams, Link } from "react-router-dom";
import { Share, Heart, MapPin, ArrowUpRight, Zap, Star } from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useFavorites } from "../hooks/useFavorites";
import { useV2Seo } from "../hooks/useV2Seo";
import { getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";
import { trackEvent } from "../../utils/analytics";

const VIEW_THROTTLE_MS = 12 * 60 * 60 * 1000; // 12시간
const VIEW_STORAGE_PREFIX = "tourstream_v2_view_";

export default function V2ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { byId, countries, categories, incrementProductView, loading } = useV2Products();
  const { isFavorite, toggleFavorite } = useFavorites();
  const product = id ? byId.get(id) : null;
  const favorited = id ? isFavorite(id) : false;
  const [shareCopied, setShareCopied] = React.useState(false);

  const handleShare = async () => {
    const shareUrl = `https://tourstream.kr/product/${id || ""}`;
    const shareData = { title: product?.name || "TourStream", url: shareUrl };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        return; // 공유 취소 등은 무시
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // clipboard 접근 실패 시 조용히 무시
    }
  };
  const country = countries.find((c) => c.id === product?.countryId);
  const category = categories.find((c) => c.id === product?.categoryId);
  const partnerLinks = product?.partnerLinks.length ? product.partnerLinks : [{ name: "공식 링크", url: product?.url || "https://tourstream.kr" }];
  const hasCoupangLink = partnerLinks.some((p) => p.name.trim() === "쿠팡");
  const hasPrice = Number(product?.price || 0) > 0;
  const safePrice = hasPrice ? product!.price : 0;
  const hasRating = Number(product?.rating || 0) > 0 && Number(product?.reviews || 0) > 0;
  const pricedLinks = partnerLinks.filter((p) => p.price !== undefined) as Array<{ price: number }>;
  const savings =
    pricedLinks.length >= 2
      ? (() => {
          const lowest = Math.min(...pricedLinks.map((p) => p.price));
          const highest = Math.max(...pricedLinks.map((p) => p.price));
          const diff = highest - lowest;
          if (diff <= 0) return null;
          return { diff, percent: Math.round((diff / highest) * 100) };
        })()
      : null;
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const canonicalPath = `/product/${id || ""}`;
  const safeName = product?.name || "상품";
  const safeDescription = product?.description || "상품 상세 정보 페이지입니다.";
  const priceLabel = hasPrice ? `${safePrice.toLocaleString("ko-KR")}원` : null;
  const seoTitle = priceLabel ? `${safeName} 최저가 ${priceLabel} | TourStream` : `${safeName} 가격비교 | TourStream`;
  const seoDescription = priceLabel
    ? `${safeDescription.slice(0, 90)} 최저 ${priceLabel}부터${
        partnerLinks.length >= 2 ? `, 파트너사 ${partnerLinks.length}곳` : ""
      } 가격을 비교해보세요.`.slice(0, 155)
    : safeDescription.slice(0, 140);

  const returnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "KR",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };

  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "KRW" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "KR" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
    },
  };

  useV2Seo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath,
    ogType: "product",
    ogImage: product?.image,
    // 삭제/비활성화된 상품은 200을 주면서 "찾을 수 없습니다"만 보여주게 되어 soft 404로 잡히므로 noindex
    robots: !loading && !product ? "noindex, follow" : "index, follow",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: safeName,
        description: safeDescription,
        image: product?.image || null,
        url: `https://tourstream.kr${canonicalPath}`,
        category: category?.name || "여행상품",
        brand: { "@type": "Brand", name: "TourStream" },
        offers: {
          "@type": "Offer",
          price: safePrice,
          priceCurrency: "KRW",
          priceValidUntil,
          availability: "https://schema.org/InStock",
          url: `https://tourstream.kr${canonicalPath}`,
          seller: { "@type": "Organization", name: "TourStream", url: "https://tourstream.kr" },
          hasMerchantReturnPolicy: returnPolicy,
          shippingDetails,
        },
        ...(hasRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product!.rating,
                reviewCount: product!.reviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: "https://tourstream.kr/" },
          country
            ? { "@type": "ListItem", position: 2, name: country.name, item: `https://tourstream.kr/country/${getCountrySlug(country)}` }
            : { "@type": "ListItem", position: 2, name: "국가", item: "https://tourstream.kr/" },
          { "@type": "ListItem", position: 3, name: safeName, item: `https://tourstream.kr${canonicalPath}` },
        ],
      },
    ],
  });

  React.useEffect(() => {
    if (!id) return;
    try {
      const storageKey = `${VIEW_STORAGE_PREFIX}${id}`;
      const raw = localStorage.getItem(storageKey);
      const lastViewedAt = raw ? Number(raw) : 0;
      const now = Date.now();
      if (Number.isFinite(lastViewedAt) && now - lastViewedAt < VIEW_THROTTLE_MS) {
        return;
      }
      localStorage.setItem(storageKey, String(now));
      incrementProductView(id).catch(() => null);
    } catch (error) {
      // storage 접근이 실패해도 조회수 증가 자체는 시도
      incrementProductView(id).catch(() => null);
    }
  }, [id, incrementProductView]);

  if (loading && !product) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 pt-16 pb-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">상품 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!product) return <div className="p-8 text-center font-bold text-2xl mt-20">상품을 찾을 수 없습니다.</div>;

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-32 md:pb-12 pt-0 md:pt-8 px-0 md:px-6 relative">
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium mb-6">
        <Link to="/" className="hover:text-brand cursor-pointer transition-colors">
          홈
        </Link>
        <span>/</span>
        {country ? (
          <Link to={`/country/${getCountrySlug(country)}`} className="hover:text-brand cursor-pointer transition-colors">
            {country.name}
          </Link>
        ) : (
          <span>국가 미지정</span>
        )}
        {product.region && (
          <>
            <span>/</span>
            <Link to={`/region/${getRegionSlug(product.region)}${country ? `?country=${encodeURIComponent(getCountrySlug(country))}` : ""}`} className="hover:text-brand cursor-pointer transition-colors">
              {product.region}
            </Link>
          </>
        )}
        <span>/</span>
        {category ? (
          <Link to={`/category/${getCategorySlug(category)}`} className="hover:text-brand cursor-pointer transition-colors">
            {category.name}
          </Link>
        ) : (
          <span>미분류</span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1">
          <div className="relative w-full h-[280px] md:h-[400px] md:rounded-3xl overflow-hidden mb-6 shadow-sm">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleShare}
                aria-label="공유하기"
                className="relative w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-brand transition-colors shadow-md"
              >
                <Share className="w-4 h-4" />
                {shareCopied && (
                  <span className="absolute top-11 right-0 whitespace-nowrap bg-slate-900 text-white text-[11px] px-2 py-1 rounded-md shadow-md">
                    링크 복사됨
                  </span>
                )}
              </button>
              <button
                onClick={() => id && toggleFavorite(id)}
                aria-label={favorited ? "찜 해제" : "찜하기"}
                className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center transition-colors shadow-md ${
                  favorited ? "text-rose-500" : "text-slate-700 hover:text-rose-500"
                } hover:bg-white`}
              >
                <Heart className={`w-4 h-4 ${favorited ? "fill-rose-500" : ""}`} />
              </button>
            </div>
          </div>

          <div className="px-5 md:px-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[11px] rounded-md">{category?.name || "미분류"}</span>
              <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {country?.name || "국가 미지정"}
              </div>
              {hasRating && (
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {product!.rating.toFixed(1)}
                  <span className="font-medium text-slate-400">({product!.reviews.toLocaleString("ko-KR")})</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug mb-4 tracking-tight">{product.name}</h1>

            <div className="prose prose-slate max-w-none text-sm md:text-base">
              <h2 className="text-xl font-bold text-slate-900 mb-4">상품 설명</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>


          </div>
        </div>

        <div className="lg:w-[320px] shrink-0">
          <div
            id="price-compare"
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mx-5 md:mx-0 lg:sticky lg:top-28 lg:rounded-3xl lg:shadow-xl lg:p-6"
          >
            <div className="flex justify-between items-end mb-4 gap-3">
              <div className="flex flex-col">
                <div className="text-brand text-xs font-bold mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> 최근 갱신 최저가
                </div>
                <div className="flex items-baseline gap-1">
                  <div className="text-xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{hasPrice ? product.price.toLocaleString() : "가격 확인 필요"}</div>
                  {hasPrice && <div className="text-sm font-bold text-slate-500">원~</div>}
                </div>
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md mb-1">{partnerLinks.length}개 파트너사 비교</div>
            </div>

            {savings && (
              <div className="text-xs font-bold text-save bg-save-tint px-2.5 py-1.5 rounded-lg inline-block mb-4">
                최고가 대비 {savings.diff.toLocaleString()}원(-{savings.percent}%) 절약
              </div>
            )}

            <div className="flex flex-col gap-2">
              {partnerLinks.map((partner, idx) => (
                <div key={`${partner.name}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      {partner.name}
                      {idx === 0 && partner.price !== undefined && (
                        <span className="text-[10px] bg-brand-tint text-brand px-1.5 py-0.5 rounded-sm font-bold">최저가</span>
                      )}
                    </span>
                    {(partner.priceDisplay || partner.price !== undefined) && (
                      <span className="text-xs text-slate-500 mt-0.5">
                        {partner.priceDisplay || `${partner.price!.toLocaleString()}원~`}
                      </span>
                    )}
                  </div>
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackEvent("partner_link_click", {
                        partner: partner.name,
                        product_id: product.id,
                        product_name: product.name,
                        price: partner.price,
                        is_best_price: idx === 0 && partner.price !== undefined,
                        placement: "product_detail",
                      })
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                      idx === 0 ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md" : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    이동
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">환율 및 예약 시점에 따라 실제 결제 가격이 달라질 수 있어요.</p>
            <p className="text-[11px] text-slate-400 mt-1">파트너사 링크를 통해 예약 시 TourStream이 일정 수수료를 받을 수 있습니다.</p>
            {hasCoupangLink && (
              <p className="text-[11px] text-slate-400 mt-1">
                이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="text-[11px] text-slate-400">최근 갱신 최저가</div>
          <div className="text-lg font-extrabold text-slate-900 tracking-tight">
            {hasPrice ? `${product.price.toLocaleString()}원~` : "가격 확인 필요"}
          </div>
        </div>
        <button
          onClick={() => document.getElementById("price-compare")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="shrink-0 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
        >
          가격 비교하기
        </button>
      </div>
    </div>
  );
}
