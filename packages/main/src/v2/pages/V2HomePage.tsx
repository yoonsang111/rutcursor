import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { V2HomeHero, HomeTab } from "../components/V2HomeHero";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import { CategoryTile } from "../components/CategoryTile";
import { useV2Products } from "../hooks/useV2Products";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useV2Seo } from "../hooks/useV2Seo";
import { flagSrc, partnerLogoSrc } from "../brand";
import { getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

const PARTNER_STRIP = ["마이리얼트립", "KLOOK", "KKday", "와그", "GetYourGuide", "트립닷컴"];

export default function V2HomePage() {
  const { items, categories, countries, getRegionImage, loading } = useV2Products();
  const [tab, setTab] = useState<HomeTab>("tour");
  const { recentIds, clear: clearRecent } = useRecentlyViewed();

  // 본 순서 그대로. 그사이 숨겨지거나 지워진 상품은 빠진다
  const recentProducts = useMemo(() => {
    const byId = new Map(items.map((p) => [p.id, p]));
    return recentIds.map((id) => byId.get(id)).filter((p): p is (typeof items)[number] => Boolean(p)).slice(0, 10);
  }, [recentIds, items]);

  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

  const topCountries = useMemo(
    () =>
      countries
        .map((country) => ({ ...country, productCount: items.filter((item) => item.countryId === country.id).length }))
        .filter((country) => country.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 9),
    [countries, items],
  );

  const homeCategories = useMemo(
    () =>
      categories
        .map((category) => ({ ...category, productCount: items.filter((item) => item.categoryId === category.id).length }))
        .filter((category) => category.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        // 4개로 끊는 이유: 아래 칸이 모바일 4칸 / PC 2칸이라 4개면 어느 쪽에서도 빈칸이 안 남는다
        .slice(0, 4),
    [categories, items],
  );

  const flaggedPopular = items.filter((p) => p.isPopular);
  const popularPool = flaggedPopular.length > 0 ? flaggedPopular : items;
  const popularProducts = popularPool
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 8);

  const recommendedProducts = items
    .filter((p) => p.isRecommended)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 4);

  /*
    인기 여행지역. 원래 이 자리는 "가격 차이 TOP" 이었는데,
    판매처가 올리는 대표가가 아동권·외화로 섞여 들어와 차이 숫자를 믿을 수 없었다.
    지역별 상품 수는 우리가 직접 세는 값이라 틀릴 수가 없어 이쪽으로 바꿨다.
  */
  const topRegions = useMemo(() => {
    const byRegion = new Map<string, { name: string; countryId: string; count: number; image?: string }>();
    items.forEach((product) => {
      const name = product.region;
      if (!name) return;
      const hit = byRegion.get(name);
      if (hit) hit.count += 1;
      else byRegion.set(name, { name, countryId: product.countryId, count: 1, image: product.image });
    });
    return Array.from(byRegion.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((region) => ({
        ...region,
        // 지역 전용 사진이 있으면 그걸, 없으면 그 지역 첫 상품 사진을 쓴다
        image: getRegionImage(region.countryId, region.name) || region.image,
        countrySlug: (() => {
          const country = countries.find((c) => c.id === region.countryId);
          return country ? getCountrySlug(country) : undefined;
        })(),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, countries]);

  const trending = popularPool
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 4)
    .map((p) => p.name);

  useV2Seo({
    // 정적 셸(generate-seo-route-shells.mjs)과 같은 값이어야 한다.
    // 다르면 JS를 실행하는 검색엔진이 마운트 후의 값을 보게 되어 셸의 SEO 문구가 무효가 된다.
    title: "일본·해외 입장권 교통패스 가격 비교 | 클룩·마이리얼트립·KKday | TourStream",
    description:
      "오사카·도쿄 등 일본 여행 입장권부터 교통패스·전망대·테마파크까지, 클룩·마이리얼트립·KKday 가격을 한 번에 비교하고 합리적으로 예약하세요.",
    canonicalPath: "/",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TourStream",
        url: "https://tourstream.kr/",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: "https://tourstream.kr/" }],
      },
    ],
  });

  return (
    // 구역을 끊는 회색 띠가 보이려면 바탕이 흰색이어야 한다 (레이아웃 기본 바탕은 연회색)
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white">
      <V2HomeHero trending={trending} tab={tab} onTabChange={setTab} />

      {/* 항공권 탭에서는 검색창 하나만 둔다 (아래 티켓 내용은 항공권과 상관이 없다) */}
      {tab === "tour" && (
        <>
      {/* 나라 바로가기 — 누르면 그 나라 화면으로 간다 */}
      <div className="flex gap-4 md:gap-5 px-5 md:px-6 pt-5 pb-5 overflow-x-auto hide-scrollbar">
        <Link to="/products" className="flex-none w-[56px] md:w-[76px] text-center">
          <span className="flex items-center justify-center w-[56px] h-[38px] md:w-[76px] md:h-[51px] rounded-[10px] md:rounded-xl text-[12px] md:text-[14px] font-bold border bg-slate-100 text-slate-500 border-black/[.07]">
            전체
          </span>
          <span className="block mt-1.5 text-[11.5px] md:text-[13.5px] font-medium tracking-[-0.02em] text-slate-900">전체</span>
        </Link>

        {topCountries.map((country) => {
          const flag = flagSrc(country.name);
          return (
            <Link key={country.id} to={`/country/${getCountrySlug(country)}`} className="flex-none w-[56px] md:w-[76px] text-center group">
              {flag ? (
                // 칸을 국기와 같은 3:2 로 두면 잘리지도, 빈자리가 남지도 않는다
                <span className="block w-[56px] h-[38px] md:w-[76px] md:h-[51px] rounded-[10px] md:rounded-xl border border-black/[.07] overflow-hidden transition-[box-shadow] group-hover:ring-2 group-hover:ring-slate-900">
                  <img src={flag} alt="" width={76} height={51} loading="lazy" className="w-full h-full object-cover" />
                </span>
              ) : (
                <span className="flex items-center justify-center w-[56px] h-[38px] md:w-[76px] md:h-[51px] rounded-[10px] md:rounded-xl bg-slate-100 text-[12px] md:text-[14px] font-bold text-slate-500 border border-black/[.07] group-hover:ring-2 group-hover:ring-slate-900">
                  {country.name.slice(0, 2)}
                </span>
              )}
              <span className="block mt-1.5 text-[11.5px] md:text-[13.5px] font-medium tracking-[-0.02em] text-slate-900 truncate">
                {country.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 판매처 띠 */}
      <div className="px-5 md:px-6 pb-6">
        <div className="relative overflow-hidden rounded-[10px] md:rounded-xl bg-gradient-to-r from-brand to-[#3470F5] px-[18px] md:px-11 py-[18px] md:py-7">
          <div className="absolute -right-6 -top-7 w-[118px] h-[118px] md:w-[290px] md:h-[290px] md:-right-16 md:-top-20 rounded-full bg-white/[.08]" />
          {/* 넓은 화면에서는 글과 로고를 좌우로 벌린다. 세로로 쌓으면 오른쪽이 비어 띠가 쓸데없이 두꺼워진다. */}
          <div className="relative md:flex md:items-center md:justify-between md:gap-8">
            <div className="text-base md:text-[26px] font-bold tracking-[-0.035em] text-white">7개 판매처, 한 번에 비교</div>
            <div className="mt-3 md:mt-0 flex gap-2 md:gap-2.5">
              {PARTNER_STRIP.map((name) => {
                const src = partnerLogoSrc(name);
                return src ? (
                  <img
                    key={name}
                    src={src}
                    alt={name}
                    width={38}
                    height={38}
                    loading="lazy"
                    className="w-[26px] h-[26px] md:w-[38px] md:h-[38px] rounded-md md:rounded-[9px] object-contain bg-white"
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 주간 인기 */}
      <section className="px-5 md:px-6">
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900">주간 인기</h2>
          <Link to="/products" className="text-[12.5px] md:text-sm text-slate-400 hover:text-brand transition-colors">
            전체 {items.length}개 &rsaquo;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
            {[0, 1, 2, 3].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : popularProducts.length === 0 ? (
          <div className="py-8 text-sm text-slate-400">보여 드릴 인기 상품이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} countryName={countryNameById.get(product.countryId)} />
            ))}
          </div>
        )}
      </section>

      {/* 인기 여행지역 + 카테고리 — 넓은 화면에서는 좌우로 나란히 둔다 */}
      {(topRegions.length > 0 || homeCategories.length > 0) && (
        <>
          <div className="h-2.5 bg-slate-100 mt-8" />
          <section className="px-5 md:px-6 pt-5 lg:grid lg:grid-cols-2 lg:gap-x-11 lg:items-start">
            {topRegions.length > 0 && (
            <div>
              <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">인기 여행지역</h2>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 lg:gap-x-[18px] lg:gap-y-4">
                {topRegions.map((region) => (
                  <Link
                    key={region.name}
                    to={`/region/${getRegionSlug(region.name)}${region.countrySlug ? `?country=${encodeURIComponent(region.countrySlug)}` : ""}`}
                    className="relative block overflow-hidden rounded-[10px] md:rounded-xl aspect-[16/10] bg-slate-100 group"
                  >
                    {region.image && (
                      <img
                        src={region.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    )}
                    {/* 어떤 사진이 와도 글씨가 읽히도록 아래쪽을 어둡게 깐다 */}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <span className="absolute left-3 bottom-2.5 right-3">
                      <span className="block text-[15px] md:text-[17px] font-bold tracking-[-0.03em] text-white drop-shadow-sm truncate">
                        {region.name}
                      </span>
                      <span className="block text-[11.5px] md:text-xs font-medium text-white/75">{region.count}개</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            )}

            {homeCategories.length > 0 && (
            <div className="mt-7 lg:mt-0">
              {/* 좁은 화면에서는 두 묶음 사이를 회색 띠로 끊는다 */}
              <div className="h-2.5 bg-slate-100 -mx-5 md:-mx-6 mb-5 lg:hidden" />
              <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">카테고리</h2>
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-x-2.5 gap-y-4 lg:gap-x-[18px]">
                {homeCategories.map((category) => (
                  <CategoryTile
                    key={category.id}
                    to={`/category/${category.id}`}
                    name={category.name}
                    count={category.productCount}
                  />
                ))}
              </div>
            </div>
            )}
          </section>
        </>
      )}

      {/* 최근 본 상품 — 본 적 없으면 줄 자체가 나오지 않는다 */}
      {recentProducts.length > 0 && (
        <>
          <div className="h-2.5 bg-slate-100 mt-7" />
          <section className="pt-5">
            <div className="px-5 md:px-6 flex items-baseline justify-between mb-3.5">
              <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900">최근 본 상품</h2>
              <button
                type="button"
                onClick={clearRecent}
                className="text-[12.5px] md:text-sm text-slate-400 hover:text-brand transition-colors"
              >
                기록 지우기
              </button>
            </div>
            <div className="flex gap-2.5 md:gap-4 overflow-x-auto hide-scrollbar px-5 md:px-6 pb-1">
              {recentProducts.map((product) => (
                <div key={product.id} className="w-[124px] md:w-[260px] flex-none">
                  <ProductCard product={product} countryName={countryNameById.get(product.countryId)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 추천 상품 */}
      {recommendedProducts.length > 0 && (
        <>
          <div className="h-2.5 bg-slate-100 mt-7" />
          <section className="px-5 md:px-6 pt-5">
            <h2 className="text-[19px] md:text-[22px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">추천 상품</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} countryName={countryNameById.get(product.countryId)} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="px-6 pt-8 pb-10 flex justify-center">
        <Link to="/products" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-brand transition-colors">
          전체 상품 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
        </>
      )}
    </div>
  );
}
