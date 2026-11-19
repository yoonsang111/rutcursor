import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { ProductBrowser } from "../components/ProductBrowser";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Coupons } from "../hooks/useV2Coupons";
import { useV2Seo } from "../hooks/useV2Seo";
import { getCountrySlug } from "../utils/urlSlugs";
import { Coupon, CouponLookup, daysLeft, formatDeadline, formatDiscount, productsForCoupon, shouldShowDday } from "../utils/coupons";
import { trackEvent } from "../../utils/analytics";

// 적용 상품이 이보다 많으면 칩으로 나열하지 않고 "N개에 적용" 한 줄로 접는다.
const MAX_CHIPS = 3;

export default function V2CouponsPage() {
  const { items, countries, categories, loading } = useV2Products();
  const { coupons, loading: couponsLoading } = useV2Coupons();
  const [partner, setPartner] = useState("전체");
  const [copied, setCopied] = useState("");

  const lookup: CouponLookup = useMemo(
    () => ({
      countryNameById: new Map(countries.map((c) => [c.id, c.name])),
      categoryNameById: new Map(categories.map((c) => [c.id, c.name])),
    }),
    [countries, categories],
  );

  const partners = useMemo(() => {
    const counts = new Map<string, number>();
    coupons.forEach((c) => counts.set(c.partner, (counts.get(c.partner) || 0) + 1));
    return [["전체", coupons.length] as [string, number], ...Array.from(counts.entries())];
  }, [coupons]);

  const visible = partner === "전체" ? coupons : coupons.filter((c) => c.partner === partner);

  /* 고른 판매처(전체면 쿠폰이 있는 판매처 전부)가 파는 상품. 아래 목록에 그대로 넘긴다. */
  const couponProducts = useMemo(() => {
    const wanted = new Set(partner === "전체" ? coupons.map((c) => c.partner) : [partner]);
    if (wanted.size === 0) return [];
    return items.filter((p) =>
      p.partnerLinks.some((l) => l.url && l.state !== "stopped" && wanted.has(l.name)),
    );
  }, [items, coupons, partner]);

  useV2Seo({
    title: "클룩·KKday 할인코드 모음 | TourStream",
    description:
      "여행 티켓·교통패스 판매처의 할인코드를 모아 비교합니다. 기간이 지난 코드는 자동으로 사라지고, 쿠폰을 쓸 수 있는 상품도 함께 확인할 수 있어요.",
    canonicalPath: "/coupons",
    ogType: "website",
    robots: !couponsLoading && coupons.length === 0 ? "noindex, follow" : "index, follow",
  });

  const copy = (coupon: Coupon) => {
    navigator.clipboard?.writeText(coupon.code).then(
      () => {
        setCopied(coupon.code);
        window.setTimeout(() => setCopied(""), 1800);
      },
      () => undefined,
    );
    trackEvent("coupon_copy", { coupon_code: coupon.code, partner: coupon.partner });
  };

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      {/* 머리말은 다른 목록 화면과 같은 모양으로 맞춘다 */}
      <section className="px-5 md:px-6 pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; 할인코드
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">할인코드</h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-slate-400">
          판매처가 직접 푸는 코드만 모았습니다. 기간이 지나면 자동으로 사라집니다.
        </p>
      </section>

      <div className="px-5 md:px-6">
        <div className="mb-5 text-[13px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 leading-relaxed">
          쿠폰을 적용하면 가장 저렴한 판매처가 바뀔 수 있어요. 코드를 복사한 뒤 상품 화면에서 비교해 보세요.
        </div>

        {partners.length > 2 && (
          <div className="mb-5 flex flex-wrap gap-1.5 md:gap-2">
            {partners.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setPartner(name)}
                aria-pressed={partner === name}
                className={`inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-[13px] transition-colors ${
                  partner === name
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-slate-100 text-slate-600 font-medium hover:bg-slate-200"
                }`}
              >
                {name}
                <span className={partner === name ? "text-white/60" : "text-slate-400"}>{count}</span>
              </button>
            ))}
          </div>
        )}

      {(loading || couponsLoading) && <div className="text-sm text-slate-500">쿠폰 불러오는 중...</div>}
      {!couponsLoading && visible.length === 0 && (
        <div className="text-sm text-slate-500">지금 사용할 수 있는 쿠폰이 없습니다.</div>
      )}

      <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
        {visible.map((coupon) => {
          const matched = productsForCoupon(items, coupon, lookup);
          const left = daysLeft(coupon);
          const urgent = left !== null && left <= 3;
          const showDday = shouldShowDday(coupon);
          const country = coupon.match.type === "location" ? countries.find((c) => c.name === coupon.match.values?.[0]) : undefined;

          return (
            <div
              key={coupon.id}
              className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-5 py-4 md:py-[18px] border-b border-slate-100 last:border-b-0"
            >
              <div className="w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-xl flex-shrink-0 bg-brand-tint flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-extrabold text-brand tracking-tight">{coupon.partner}</span>
                <span
                  className={`font-extrabold text-brand leading-none ${
                    formatDiscount(coupon.discount).length > 4 ? "text-sm md:text-base" : "text-xl md:text-2xl"
                  }`}
                >
                  {formatDiscount(coupon.discount)}
                </span>
              </div>

              <div className="flex-[1_1_calc(100%-96px)] md:flex-[0_1_260px] md:min-w-[180px] order-2 md:order-none">
                <div className="font-bold text-sm text-slate-900 leading-snug mb-1 line-clamp-2">{coupon.label}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-2">
                  {showDday && left !== null && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        urgent ? "text-amber-700 bg-amber-100" : "text-brand bg-brand-tint"
                      }`}
                    >
                      D-{Math.max(left, 0)}
                    </span>
                  )}
                  <span>{formatDeadline(coupon)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 코드가 길면 글자 쪽이 줄어들어야 한다. 안 그러면 복사 버튼이 두 줄로 쪼개진다 */}
                  <code className="min-w-0 break-all font-mono text-[13px] font-bold tracking-wider text-slate-900 border border-dashed border-slate-300 rounded-lg px-3 py-1.5">
                    {coupon.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(coupon)}
                    className="flex-none text-xs font-bold text-brand px-1 py-1 flex items-center gap-1 whitespace-nowrap"
                    aria-label={`${coupon.code} 복사`}
                  >
                    {copied === coupon.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === coupon.code ? "복사됨" : "복사"}
                  </button>
                </div>
                {coupon.terms && <div className="text-[11px] text-slate-400 mt-1.5">{coupon.terms}</div>}
              </div>

              <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0 order-3 md:order-none">
                {matched.length === 0 && (
                  <span className="text-xs text-slate-400">판매처에서 바로 사용하세요.</span>
                )}
                {matched.length > 0 && matched.length <= MAX_CHIPS &&
                  matched.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      className="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs min-w-[92px] max-w-[168px]"
                    >
                      <span className="font-bold text-slate-400 truncate">{p.name}</span>
                      <span className="font-extrabold text-slate-900">
                        {p.price > 0 ? `${p.price.toLocaleString("ko-KR")}원부터` : "가격 보기"}
                      </span>
                    </Link>
                  ))}
                {matched.length > MAX_CHIPS && (
                  <Link
                    to={country ? `/country/${getCountrySlug(country)}` : "/products"}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-brand bg-brand-tint text-xs font-bold text-brand"
                  >
                    적용 상품 {matched.length}개 보기 →
                  </Link>
                )}
              </div>

              <a
                href={coupon.landingUrl || "https://www.klook.com/ko/"}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => trackEvent("coupon_partner_click", { coupon_code: coupon.code, partner: coupon.partner })}
                className="flex-shrink-0 ml-auto text-[13px] font-bold text-brand flex items-center gap-1 order-4 md:order-none"
              >
                쓰러 가기 →
              </a>
            </div>
          );
        })}
      </div>

        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          쿠폰 조건과 적용 대상은 판매처 정책에 따라 변경될 수 있습니다. 최종 할인 금액은 판매처 결제 화면에서 확인해주세요.
        </p>
      </div>

      {/*
        전에는 코드만 보여 주고 끝나는 섬이었다.
        코드를 복사한 손님이 "그래서 뭘 사지"로 이어지도록 그 판매처 상품을 붙인다.
      */}
      {couponProducts.length > 0 && (
        <>
          <div className="h-2.5 bg-slate-100 mt-9" />
          <section className="px-5 md:px-6 pt-5 pb-1">
            <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900">
              {partner === "전체" ? "할인코드가 있는 판매처 상품" : `${partner} 상품`}
            </h2>
            <p className="mt-1 text-[13px] text-slate-400">
              상품 <b className="font-bold text-slate-900">{couponProducts.length.toLocaleString("ko-KR")}</b>개 ·
              값은 쿠폰을 넣기 전 기준입니다
            </p>
          </section>
          <ProductBrowser
            products={couponProducts}
            categories={categories}
            countryNameById={lookup.countryNameById}
            searchPlaceholder={partner === "전체" ? "상품 이름으로 찾기" : `${partner} 상품 안에서 검색`}
            hideFilters={partner === "전체" ? [] : ["seller"]}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
