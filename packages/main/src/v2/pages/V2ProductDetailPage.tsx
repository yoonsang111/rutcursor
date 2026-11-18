import React from "react";
import { useParams, Link } from "react-router-dom";
import { Share, Heart, ArrowUpRight, Star, Ticket } from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useV2Seo } from "../hooks/useV2Seo";
import { useV2Coupons } from "../hooks/useV2Coupons";
import { couponsForProduct, formatDeadline, formatDiscount } from "../utils/coupons";
import { getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";
import { partnerLogoSrc } from "../brand";
import { ProductCard } from "../components/ProductCard";
import { trackEvent } from "../../utils/analytics";
import { api } from "../../utils/api";

const VIEW_THROTTLE_MS = 12 * 60 * 60 * 1000; // 12시간
// 판매처 상태를 언제 확인했는지 (예: 10월 3일 확인). 7일 넘은 확인은 '예전 확인'으로 따로 표시
const checkedLabel = (iso?: string, stale?: boolean) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 확인${stale ? " · 예전 확인" : ""}`;
};
const VIEW_STORAGE_PREFIX = "tourstream_v2_view_";

export default function V2ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { byId, items, countries, categories, countryById, incrementProductView, loading } = useV2Products();
  const { isFavorite, toggleFavorite } = useFavorites();
  // 예전에 받아 둔 목록에 있어도, 서버가 '지금은 공개 아님(숨김·초안·삭제)'이라고 하면 보여 주지 않음
  // 상품을 열면 "최근 본 상품"에 남긴다 (이 브라우저에만 저장, 서버로 안 보냄)
  const { record: recordRecentlyViewed } = useRecentlyViewed();
  React.useEffect(() => {
    if (id) recordRecentlyViewed(id);
  }, [id, recordRecentlyViewed]);

  const [goneId, setGoneId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!id) return;
    let active = true;
    // 열 때 + 다른 탭·앱에 갔다가 돌아올 때마다 다시 확인 (열어 둔 화면도 숨김을 반영)
    const check = () => api.isStillPublic(id).then((ok) => { if (active && ok === false) setGoneId(id); });
    check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check); // 뒤로 가기로 돌아온 저장된 페이지
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", check); window.removeEventListener("pageshow", check); };
  }, [id]);
  const product = id && goneId !== id ? byId.get(id) : null;
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
  const { coupons } = useV2Coupons();
  const country = countries.find((c) => c.id === product?.countryId);
  // 이 상품에 쓸 수 있는 쿠폰. 보통 1~2개라 판매처 줄 바로 아래에 붙인다.
  const productCoupons = React.useMemo(() => {
    if (!product) return [];
    return couponsForProduct(coupons, product, {
      countryNameById: new Map(countries.map((c) => [c.id, c.name])),
      categoryNameById: new Map(categories.map((c) => [c.id, c.name])),
    });
  }, [coupons, product, countries, categories]);
  const category = categories.find((c) => c.id === product?.categoryId);
  const noBookable = product?.bookable === "none"; // 모든 판매처의 판매 중지가 확인됨 (상세는 안내용)
  const partnerLinks: NonNullable<typeof product>["partnerLinks"] = product?.partnerLinks.length
    ? product.partnerLinks
    : noBookable
      ? []
      : [{ name: "공식 링크", url: product?.url || "https://tourstream.kr" }];
  const openLinks = partnerLinks.filter((p) => p.url && p.state !== "stopped");
  // 대신 볼 만한 상품: 같은 분류·나라의 예약 가능한 공개 상품
  const alternatives = React.useMemo(() => {
    if (!product || !noBookable) return [];
    return items
      .filter((o) => o.id !== product.id && (o.categoryId === product.categoryId || o.countryId === product.countryId))
      .sort((a, b) => Number(b.categoryId === product.categoryId) - Number(a.categoryId === product.categoryId) || b.popularityScore - a.popularityScore)
      .slice(0, 4);
  }, [items, product, noBookable]);
  const hasCoupangLink = partnerLinks.some((p) => p.name.trim() === "쿠팡");
  const hasPrice = Number(product?.price || 0) > 0;
  const safePrice = hasPrice ? product!.price : 0;
  const hasRating = Number(product?.rating || 0) > 0 && Number(product?.reviews || 0) > 0;
  const pricedLinks = openLinks.filter((p) => p.price !== undefined) as Array<{ price: number }>;
  const lowestPrice = pricedLinks.length > 0 ? Math.min(...pricedLinks.map((p) => p.price)) : undefined;
  const savings =
    pricedLinks.length >= 2
      ? (() => {
          const lowest = Math.min(...pricedLinks.map((p) => p.price));
          const highest = Math.max(...pricedLinks.map((p) => p.price));
          const diff = highest - lowest;
          if (diff <= 0) return null;
          const percent = Math.round((diff / highest) * 100);
          // 판매처마다 기준 옵션(어른/어린이, 1일/7일)이 달라 차이가 비현실적으로 벌어지는 일이 있다.
          // 그걸 할인처럼 보여 주면 손님을 속이게 되므로, 차이가 너무 크면 아예 안 보여 준다.
          if (percent > 50) return null;
          return { diff, percent, highest };
        })()
      : null;
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const canonicalPath = `/product/${id || ""}`;
  const safeName = product?.name || "상품";
  const safeDescription = product?.description || "상품 상세 정보 페이지입니다.";
  const priceLabel = hasPrice ? `${safePrice.toLocaleString("ko-KR")}원` : null;
  const seoTitle = priceLabel ? `${safeName} ${priceLabel}부터 | TourStream` : `${safeName} 가격비교 | TourStream`;
  const seoDescription = priceLabel
    ? `${safeDescription.slice(0, 90)} ${priceLabel}부터${
        openLinks.length >= 2 ? `, 파트너사 ${openLinks.length}곳` : ""
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
    // 예약 링크가 하나도 없는 상품은 들어와도 할 수 있는 게 없는 막다른 페이지라 색인 대상에서 뺀다.
    // (링크가 등록되면 자동으로 다시 색인 대상이 된다)
    robots:
      !loading && (!product || noBookable || (product.partnerLinks || []).filter((l) => l.url).length === 0)
        ? "noindex, follow"
        : "index, follow",
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
        // 가격이 없으면 가격 정보(Offer)를 넣지 않음 (0원으로 알리지 않음)
        ...(hasPrice
          ? {
              offers: {
                "@type": "Offer",
                price: safePrice,
                priceCurrency: "KRW",
                priceValidUntil,
                availability: noBookable ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                url: `https://tourstream.kr${canonicalPath}`,
                seller: { "@type": "Organization", name: "TourStream", url: "https://tourstream.kr" },
                hasMerchantReturnPolicy: returnPolicy,
                shippingDetails,
              },
            }
          : {}),
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
        // 국가를 모를 때 "국가"라는 빈 단계를 넣지 않고 아예 생략한다.
        // (잘못된 나라가 검색결과 빵부스러기에 노출되던 문제와 같은 맥락)
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: "https://tourstream.kr/" },
          ...(country
            ? [{ "@type": "ListItem", position: 2, name: country.name, item: `https://tourstream.kr/country/${getCountrySlug(country)}` }]
            : []),
          { "@type": "ListItem", position: country ? 3 : 2, name: safeName, item: `https://tourstream.kr${canonicalPath}` },
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
    // 실제 화면과 같은 틀의 회색 자리맡기 (데이터 도착 시 footer 까지 밀리는 것 방지)
    return (
      <div aria-busy="true" className="w-full max-w-[1200px] mx-auto pb-32 md:pb-12 pt-0 md:pt-8 px-0 md:px-6 relative">
        <p role="status" className="sr-only">상품 정보를 불러오는 중...</p>
        <div className="hidden md:flex items-center gap-2 mb-6">
          <div className="h-5 w-48 rounded bg-slate-100" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1">
            <div className="w-full h-[280px] md:h-[400px] md:rounded-3xl mb-6 bg-slate-100" />
            <div className="px-5 md:px-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-6 w-16 rounded-md bg-slate-100" />
                <div className="h-4 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-8 md:h-9 w-4/5 rounded bg-slate-100 mb-4" />
              <div className="h-7 w-24 rounded bg-slate-100 mb-4" />
              <div className="flex flex-col gap-2">
                <div className="h-5 rounded bg-slate-100" />
                <div className="h-5 rounded bg-slate-100" />
                <div className="h-5 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="lg:w-[320px] shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mx-5 md:mx-0 lg:rounded-3xl lg:shadow-xl lg:p-6">
              <div className="h-4 w-16 rounded bg-slate-100 mb-2" />
              <div className="h-7 lg:h-9 w-40 rounded bg-slate-100 mb-4" />
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[62px] rounded-xl border border-slate-100 bg-slate-50" />
                ))}
              </div>
              <div className="h-3 w-full rounded bg-slate-100 mt-3" />
              <div className="h-3 w-4/5 rounded bg-slate-100 mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="p-8 text-center font-bold text-2xl mt-20">상품을 찾을 수 없습니다.</div>;

  // 아래 고정 띠가 보낼 곳: 값이 있는 판매처 중 제일 싼 곳 (값이 하나도 없으면 비교표로 내린다)
  const bestLink = partnerLinks.find((p) => p.url && p.state !== "stopped" && p.price !== undefined);

  // 함께 본 상품: 같은 분류·나라의 다른 공개 상품 4개
  const related = items
    .filter((o) => o.id !== product.id && (o.categoryId === product.categoryId || o.countryId === product.countryId))
    .sort(
      (a, b) =>
        Number(b.categoryId === product.categoryId) - Number(a.categoryId === product.categoryId) ||
        b.popularityScore - a.popularityScore,
    )
    .slice(0, 4);

  // 판매처는 이름보다 로고로 알아보는 게 빠르다. 로고가 없는 판매처는 칸을 비워 둔다.
  const PartnerLogo = ({ name }: { name: string }) => {
    const src = partnerLogoSrc(name);
    if (!src) return null;
    return (
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="w-8 h-8 flex-none rounded-lg object-contain bg-white border border-slate-100"
      />
    );
  };

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

      {/*
        좁은 화면에서는 사진 → 제목 → 가격 → 설명 순서로 읽히게 한다 (가격이 설명 밑에 깔리면 안 된다).
        넓은 화면에서는 왼쪽에 사진·제목·설명, 오른쪽에 가격 패널을 세워 둔다.
      */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] lg:gap-x-12 lg:items-start">
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <div className="relative w-full h-[280px] md:h-[400px] md:rounded-3xl overflow-hidden mb-6 shadow-sm">
            <img src={product.image} alt={product.name} width={1200} height={630} fetchPriority="high" className="w-full h-full object-cover" />
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
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <span className="inline-flex items-center h-[21px] px-[7px] rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                {[country?.name, product.region].filter(Boolean).join(" · ") || "국가 미지정"}
              </span>
              <span className="inline-flex items-center h-[21px] px-[7px] rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                {category?.name || "미분류"}
              </span>
            </div>

            <h1 className="text-[20px] md:text-[28px] font-bold text-slate-900 leading-[1.38] tracking-[-0.04em]">{product.name}</h1>

            {hasRating && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] md:text-sm text-slate-400">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900">{product!.rating.toFixed(1)}</span>
                <span>리뷰 {product!.reviews.toLocaleString("ko-KR")}</span>
              </div>
            )}
          </div>
        </div>

        {/* 상품 설명·함께 본 상품: 모바일에서는 가격 아래, 데스크톱에서는 사진 아래 왼쪽 칸 */}
        <div className="order-3 lg:col-start-1 lg:row-start-2">
          <div className="h-2.5 bg-slate-100 my-6 lg:hidden" />
          <div className="px-5 md:px-0">
            <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3">상품 정보</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {related.length > 0 && (
            <>
              <div className="h-2.5 bg-slate-100 my-6 lg:hidden" />
              <div className="lg:mt-10 lg:pt-8 lg:border-t lg:border-slate-100">
                <h2 className="px-5 md:px-0 text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">함께 본 상품</h2>
                <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-5 md:px-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible">
                  {related.map((p) => (
                    <div key={p.id} className="w-[124px] flex-none lg:w-auto">
                      <ProductCard product={p} countryName={countryById.get(p.countryId)?.name} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div
            id="price-compare"
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mx-5 md:mx-0 lg:sticky lg:top-28 lg:rounded-3xl lg:shadow-xl lg:p-6"
          >
            <div className="mb-4">
              <div className="text-brand text-xs font-bold">
                {hasPrice ? "최저가" : "가격 비교"} · 판매처 {partnerLinks.length}곳
              </div>
              <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                <div className="text-[26px] lg:text-[32px] font-bold text-slate-900 tracking-[-0.045em] leading-none">
                  {hasPrice ? `${product.price.toLocaleString()}원` : "판매처에서 확인"}
                </div>
                {savings && <div className="text-[13px] text-slate-300 line-through">{savings.highest.toLocaleString()}원</div>}
              </div>
            </div>

            {noBookable && (
              <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-bold">현재 예약 가능한 판매처가 없어요</div>
                <div className="text-xs mt-1">모든 판매처에서 일시 품절이거나 판매를 멈췄어요.{alternatives.length > 0 ? " 비슷한 상품을 확인해 보세요." : ""}</div>
                {alternatives.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {alternatives.map((alt) => (
                      <li key={alt.id}>
                        <Link to={`/product/${alt.id}`} className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-brand">
                          <img src={alt.image} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                          <span className="line-clamp-1">{alt.name}</span>
                          {alt.price > 0 && <span className="ml-auto flex-shrink-0 text-slate-500 font-medium">{alt.price.toLocaleString()}원부터</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {savings && (
              <div className="text-xs font-bold text-[#FF3B46] bg-[#FFECEE] px-2.5 py-1.5 rounded-lg inline-block mb-4">
                최고가 대비 -{savings.diff.toLocaleString()}원 ({savings.percent}%)
              </div>
            )}

            <div className="flex items-baseline justify-between mb-2.5">
              <h2 className="text-[15px] font-bold tracking-[-0.03em] text-slate-900">판매처 비교</h2>
              <span className="text-[12px] text-slate-400">가격 낮은 순</span>
            </div>

            <div className="flex flex-col gap-2">
              {partnerLinks.map((partner, idx) => (partner.state === "stopped" || !partner.url) ? (
                <div key={`${partner.name}-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-70">
                  <PartnerLogo name={partner.name} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-slate-500">{partner.name}</span>
                    <span className="text-xs text-slate-500 mt-0.5">일시 품절 또는 판매 중지{checkedLabel(partner.checkedAt, partner.stale) ? ` (${checkedLabel(partner.checkedAt, partner.stale)})` : ""}</span>
                  </div>
                  <span aria-disabled="true" className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold bg-slate-200 text-slate-500 cursor-not-allowed">
                    예약 불가
                  </span>
                </div>
              ) : (
                <div
                  key={`${partner.name}-${idx}`}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors group ${
                    idx === 0 && partner.price !== undefined
                      ? "bg-brand-tint/40 border-brand"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-100"
                  }`}
                >
                  <PartnerLogo name={partner.name} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{partner.name}</span>
                      {idx === 0 && partner.price !== undefined && partner.state !== "partial" && (
                        <span className="flex-none text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-sm font-bold">최저가</span>
                      )}
                    </span>
                    {(partner.priceDisplay || partner.price !== undefined) && (
                      <span className="text-xs text-slate-500 mt-0.5 flex items-baseline gap-1.5">
                        {/* 가격만 보여준다. priceNote(가격 출처·계산 방법)는 우리 기록용이라 손님에게는 숨긴다 */}
                        <span className="font-bold text-slate-900 text-[13px]">
                          {partner.priceDisplay || `${partner.price!.toLocaleString()}원부터`}
                        </span>
                        {/* 1등보다 얼마를 더 내는지 바로 보여 준다 — 손님이 머리로 빼지 않게 */}
                        {partner.price !== undefined && lowestPrice !== undefined && partner.price > lowestPrice && (
                          <span className="text-[11px] font-medium text-[#FF3B46]">
                            +{(partner.price - lowestPrice).toLocaleString()}원
                          </span>
                        )}
                      </span>
                    )}
                    {partner.state === "partial" && (
                      <span className="text-[11px] text-amber-700 mt-0.5">
                        일부 날짜·옵션 품절{partner.soldOutNote ? `: ${partner.soldOutNote}` : ""}
                        {checkedLabel(partner.checkedAt, partner.stale) ? ` (${checkedLabel(partner.checkedAt, partner.stale)})` : ""}
                      </span>
                    )}
                    {productCoupons
                      .filter((c) => c.partner === partner.name)
                      .slice(0, 1)
                      .map((c) => (
                        <Link
                          key={c.id}
                          to="/coupons"
                          className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-brand min-w-0"
                          title={`${formatDiscount(c.discount)} 할인코드 ${c.code} · ${formatDeadline(c)}`}
                        >
                          <Ticket className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-shrink-0">{formatDiscount(c.discount)} 쿠폰</span>
                          <span className="font-mono font-bold truncate">{c.code}</span>
                        </Link>
                      ))}
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
                    className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
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

      {/* 화면을 내려도 따라오는 아래 띠. 제일 싼 판매처로 바로 보낸다 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 flex items-center gap-3">
        <button
          onClick={() => id && toggleFavorite(id)}
          aria-label={favorited ? "찜 해제" : "찜하기"}
          className="shrink-0 w-11 flex flex-col items-center justify-center"
        >
          <Heart className={`w-6 h-6 ${favorited ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
        </button>
        {bestLink ? (
          <a
            href={bestLink.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("partner_link_click", {
                partner: bestLink.name,
                product_id: product.id,
                product_name: product.name,
                price: bestLink.price,
                is_best_price: true,
                placement: "sticky_bar",
              })
            }
            className="flex-1 h-[50px] rounded-xl bg-brand text-white flex items-center justify-center gap-2 font-bold"
          >
            {partnerLogoSrc(bestLink.name) && (
              <img src={partnerLogoSrc(bestLink.name)} alt="" width={22} height={22} className="w-[22px] h-[22px] rounded-md object-contain bg-white" />
            )}
            <span className="text-[15px] tracking-[-0.03em] truncate">{bestLink.name}</span>
            {bestLink.price !== undefined && <span className="text-[15px]">{bestLink.price.toLocaleString()}원</span>}
          </a>
        ) : (
          <button
            onClick={() => document.getElementById("price-compare")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex-1 h-[50px] rounded-xl bg-slate-900 text-white font-bold text-[15px]"
          >
            판매처 보기
          </button>
        )}
      </div>
    </div>
  );
}
