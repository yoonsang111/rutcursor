import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
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
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">할인코드</h1>
        <p className="text-slate-500 text-base">판매처가 제공하는 쿠폰을 모아 비교해보세요.</p>
      </div>

      <div className="mb-6 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 leading-relaxed">
        쿠폰을 적용하면 최저가 판매처가 바뀔 수 있어요. 코드를 복사한 뒤 상품 페이지에서 비교해보세요. 기간이 지난 코드는 자동으로
        사라집니다.
      </div>

      {partners.length > 2 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {partners.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setPartner(name)}
              className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                partner === name
                  ? "border-brand bg-brand-tint text-brand font-bold"
                  : "border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300"
              }`}
            >
              {name} {count}
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
                  <code className="font-mono text-[13px] font-bold tracking-wider text-slate-900 border border-dashed border-slate-300 rounded-lg px-3 py-1.5">
                    {coupon.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(coupon)}
                    className="text-xs font-bold text-brand px-1 py-1 flex items-center gap-1"
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
                        {p.price > 0 ? `${p.price.toLocaleString("ko-KR")}원~` : "가격 보기"}
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
  );
}
