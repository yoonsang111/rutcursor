import React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import V2NotFoundPage from "./V2NotFoundPage";
import { findCountryBySlug, findRegionNameBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

export default function V2RegionPage() {
  const { name: regionSlug } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const countrySlug = searchParams.get("country");
  const { items, countries, categories, getRegionImage, loading } = useV2Products();
  const countryNameById = React.useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const country = findCountryBySlug(countries, countrySlug);
  const resolvedRegionName = findRegionNameBySlug(countries, regionSlug, countrySlug);
  const fallbackRegionName = (regionSlug || "").trim();
  const safeRegionName = resolvedRegionName || fallbackRegionName || "지역";
  const resolvedCountry =
    country || countries.find((c) => c.regions.some((region) => getRegionSlug(region) === getRegionSlug(safeRegionName)));

  const regionProducts = items.filter((p) => p.region === safeRegionName);
  const regionCategories = categories.filter((category) => regionProducts.some((product) => product.categoryId === category.id));
  const regionHeroImage = getRegionImage(resolvedCountry?.id, safeRegionName) || regionProducts[0]?.image;
  const canonicalPath = `/region/${getRegionSlug(safeRegionName)}${resolvedCountry ? `?country=${encodeURIComponent(getCountrySlug(resolvedCountry))}` : ""}`;

  const regionMinPrice = regionProducts.length > 0 ? Math.min(...regionProducts.map((p) => p.price || Infinity)) : Infinity;
  const regionPriceLabel = Number.isFinite(regionMinPrice) ? `${regionMinPrice.toLocaleString("ko-KR")}원` : null;

  /*
    없는 지역 주소(/region/osaka-castle-ticket 같은 오타·옛 링크)는 지도에 없다.
    전에는 슬러그를 그대로 제목에 박은 빈 페이지가 돼서, 손님은 막다른 길에 도착하고
    검색엔진은 "osaka-castle-ticket 지역 여행 상품" 이라는 쓰레기 페이지를 봤다.
  */
  const notFound = !loading && (!regionSlug || !resolvedRegionName);

  // 404로 보낼 때도 제목·canonical 을 같이 바꾼다. 안 그러면 이 화면의 값이 나중에 덮어쓴다.
  useV2Seo(
    notFound
      ? {
          title: "페이지를 찾을 수 없습니다 | TourStream",
          description: "요청하신 페이지를 찾을 수 없습니다.",
          canonicalPath: "/404",
          ogType: "website",
          robots: "noindex, follow",
        }
      : {
          title: regionPriceLabel
            ? `${safeRegionName} 최저 ${regionPriceLabel}부터 | 가격비교 TourStream`
            : `${safeRegionName} 지역 여행 상품 | TourStream`,
          description: `${safeRegionName} 상품 ${regionProducts.length}개${
            regionPriceLabel ? `, 최저 ${regionPriceLabel}부터` : ""
          } 비교해보세요.`,
          canonicalPath,
          ogType: "website",
          ogImage: regionHeroImage,
          // 상품이 0개인 지역 페이지는 soft 404로 잡히므로 noindex
          robots: !loading && regionProducts.length === 0 ? "noindex, follow" : "index, follow",
          jsonLd: [
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `${safeRegionName} 지역 여행 상품`,
              url: `https://tourstream.kr${canonicalPath}`,
            },
          ],
        },
  );

  // 404 화면은 주소의 낱말로 비슷한 상품을 대신 보여 준다
  if (notFound) return <V2NotFoundPage />;

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link>
          {resolvedCountry && <> &rsaquo; {resolvedCountry.name}</>} &rsaquo; {safeRegionName}
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">{safeRegionName}</h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-slate-400">
          상품 <b className="font-bold text-slate-900">{regionProducts.length.toLocaleString("ko-KR")}</b>개
        </p>

        {regionCategories.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
            {regionCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/destination/${getRegionSlug(safeRegionName)}/${getCategorySlug(cat)}`}
                className="flex-none h-8 px-3.5 inline-flex items-center rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <ProductBrowser
        products={regionProducts}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder={`${safeRegionName} 안에서 검색`}
        emptyText="이 지역의 상품이 아직 없습니다."
      />
    </div>
  );
}
