import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import { matchesCategory, matchesLocation } from "../utils/filterHelpers";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import AdWidget from "../components/ad-widgets/AdWidget";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recommended = searchParams.get('recommended') === 'true';
  
  const [keyword, setKeyword] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");
  const [allProducts, setAllProducts] = useState<any[]>([]);

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
        console.error("[ProductsPage] 상품 로드 실패:", error);
        setAllProducts([]);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const pageTitle = recommended ? "추천 액티비티 | TourStream" : "전체 상품 | TourStream";
    const pageDescription = recommended
      ? "TourStream 추천 액티비티를 한눈에 비교하고 예약하세요."
      : "TourStream의 전체 상품을 카테고리/지역별로 비교하고 예약하세요.";
    const canonicalUrl = recommended
      ? "https://tourstream.kr/products?recommended=true"
      : "https://tourstream.kr/products";

    document.title = pageTitle;
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", pageDescription);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, [recommended]);

  // 필터링된 상품들 (검색어는 검색 버튼 클릭 시에만 적용)
  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter((product) => {
      // 추천 필터
      if (recommended && !product.isRecommended) {
        return false;
      }

      // 지역 필터
      const locationMatch = matchesLocation(product.locations || [], selectedLocation);

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
          // 숫자형/문자형 ID가 섞여 있어도 최신 순으로 정렬
          const aId = /^\d{6}$/.test(a.id) ? parseInt(a.id, 10) : parseInt(String(a.id).replace(/[^0-9]/g, "") || "0", 10);
          const bId = /^\d{6}$/.test(b.id) ? parseInt(b.id, 10) : parseInt(String(b.id).replace(/[^0-9]/g, "") || "0", 10);
          return bId - aId;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allProducts, selectedLocation, selectedCategory, sortBy, recommended]);

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {recommended ? "추천 액티비티" : "전체 상품"}
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length}개의 상품이 있습니다
          </p>
        </div>

        {/* 검색바 */}
        <div className="mb-6">
          <SearchBar 
            value={keyword} 
            onChange={setKeyword}
            onSearch={handleSearch}
          />
        </div>

        {/* 필터 및 정렬 */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4">
            <FilterBar
              selectedLocation={selectedLocation}
              selectedCategory={selectedCategory}
              onLocationChange={setSelectedLocation}
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
                {/* 12개마다 광고 삽입 */}
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
              <span className="text-gray-500 text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600 mb-4">다른 키워드로 검색해보세요</p>
            <button 
              onClick={() => {
                setKeyword('');
                setSelectedLocation('전체');
                setSelectedCategory('전체');
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
