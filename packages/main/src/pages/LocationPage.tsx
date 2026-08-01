import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../utils/api";
import { matchesCategory, matchesLocation } from "../utils/filterHelpers";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import AdWidget from "../components/ad-widgets/AdWidget";

export default function LocationPage() {
  const navigate = useNavigate();
  const params = useParams<{ "*": string }>();
  const locationParam = params["*"] || "";
  
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  
  const locationName = locationParam ? decodeURIComponent(locationParam) : '';

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const apiProducts = await api.getProducts();
        const cleanedProducts = apiProducts.map((product: any) => ({
          ...product,
          images: []
        }));
        setAllProducts(cleanedProducts);
      } catch (error) {
        console.error("[LocationPage] 상품 로드 실패:", error);
        setAllProducts([]);
      }
    };
    loadProducts();
  }, []);
  
  // SEO 메타 태그 설정
  useEffect(() => {
    if (!locationName) return;
    
    const title = `${locationName} 투어 가격 비교 및 예약 | TourStream`;
    const description = `${locationName} 지역의 전세계 투어와 액티비티를 한눈에 가격 비교하고 예약하세요. 패러세일링, 서핑, 스키, 다이빙 등 다양한 활동을 KKday, Klook, Trip.com, GetYourGuide 등 여러 예약 사이트의 최저가를 비교해 즉시 예약 가능합니다.`;
    const keywords = `${locationName}, ${locationName} 투어, ${locationName} 예약, ${locationName} 가격 비교, 투어 비교, 액티비티 예약, 메타서치`;
    
    // 페이지 제목
    document.title = title;
    
    // 메타 설명
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', description);
      document.head.appendChild(metaDescription);
    }
    
    // 메타 키워드
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords);
    } else {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      metaKeywords.setAttribute('content', keywords);
      document.head.appendChild(metaKeywords);
    }
    
    // Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://tourstream.kr/location/${encodeURIComponent(locationName)}`);

    // canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `https://tourstream.kr/location/${encodeURIComponent(locationName)}`);
    
    // Twitter
    const twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    
    const twitterDescription = document.querySelector('meta[property="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description);
    
    // BreadcrumbList 구조화된 데이터
    const existingBreadcrumb = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }
    
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.setAttribute('data-breadcrumb', 'true');
    breadcrumbScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "홈",
          "item": "https://tourstream.kr"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "지역",
          "item": "https://tourstream.kr/locations"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": locationName,
          "item": `https://tourstream.kr/location/${encodeURIComponent(locationName)}`
        }
      ]
    });
    document.head.appendChild(breadcrumbScript);
    
    // 컴포넌트 언마운트 시 원래 제목으로 복원
    return () => {
      document.title = "TourStream - 전세계 투어 가격 비교 및 예약 플랫폼";
    };
  }, [locationName]);

  // 지역별 상품 필터링
  const filteredProducts = useMemo(() => {
    if (!locationName) return [];

    let filtered = allProducts.filter((product) => {
      // 지역 필터
      const locationMatch = matchesLocation(product.locations || [], locationName);

      // 카테고리 필터
      const categoryMatch = matchesCategory(product.categories || [], selectedCategory);

      return locationMatch && categoryMatch;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          const aId = /^\d{6}$/.test(String(a.id)) ? parseInt(String(a.id), 10) : parseInt(String(a.id).replace(/[^0-9]/g, "") || "0", 10);
          const bId = /^\d{6}$/.test(String(b.id)) ? parseInt(String(b.id), 10) : parseInt(String(b.id).replace(/[^0-9]/g, "") || "0", 10);
          return bId - aId;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allProducts, locationName, selectedCategory, sortBy]);

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {locationName} 지역
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length}개의 상품이 있습니다
          </p>
        </div>

        {/* 필터 및 정렬 */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4">
            <FilterBar
              selectedLocation={locationName}
              selectedCategory={selectedCategory}
              onLocationChange={() => {}}
              onCategoryChange={setSelectedCategory}
              allProducts={allProducts}
            />
            <div className="mt-3">
              <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
            </div>
          </div>
        </div>

        {/* 상품 그리드 */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, index) => (
              <React.Fragment key={product.id}>
                <ProductCard 
                  product={product} 
                  onProductClick={handleProductClick}
                />
                {(index + 1) % 12 === 0 && index + 1 < filteredProducts.length && (
                  <div className="col-span-full flex justify-center my-4">
                    <AdWidget />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-500 text-2xl">📍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">상품이 없습니다</h3>
            <p className="text-gray-600 mb-4">다른 지역을 확인해보세요</p>
            <button 
              onClick={() => navigate('/products')}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md"
            >
              전체 상품 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
