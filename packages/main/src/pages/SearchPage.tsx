import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { products as mockProducts } from "../mock/products";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import AdWidget from "../components/ad-widgets/AdWidget";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  
  const [keyword, setKeyword] = useState(queryParam);
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");

  // URL 파라미터와 동기화
  React.useEffect(() => {
    if (queryParam && queryParam !== keyword) {
      setKeyword(queryParam);
    }
  }, [queryParam]);

  // 필터링된 상품들
  const filteredProducts = useMemo(() => {
    if (!keyword.trim()) {
      return [];
    }

    let filtered = mockProducts.filter((product) => {
      // 검색어 필터
      const searchTarget = [
        product.name,
        product.description,
        ...product.tags,
        ...product.categories,
        ...product.locations,
      ].join(" ").toLowerCase();
      
      const keywordMatch = searchTarget.includes(keyword.toLowerCase());

      // 지역 필터
      const locationMatch = selectedLocation === "전체" || 
        product.locations.some(location => location.includes(selectedLocation));

      // 카테고리 필터
      const categoryMatch = selectedCategory === "전체" || 
        product.categories.includes(selectedCategory);

      return keywordMatch && locationMatch && categoryMatch;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          return parseInt(b.id.split('_')[1]) - parseInt(a.id.split('_')[1]);
        default:
          return 0;
      }
    });

    return filtered;
  }, [keyword, selectedLocation, selectedCategory, sortBy]);

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleSearch = (searchTerm: string) => {
    setSearchParams({ q: searchTerm });
    setKeyword(searchTerm);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            검색 결과
          </h1>
          {keyword && (
            <p className="text-gray-600">
              "<span className="font-semibold text-blue-600">{keyword}</span>"에 대한 검색 결과 {filteredProducts.length}개
            </p>
          )}
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
        {keyword && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4">
              <FilterBar
                selectedLocation={selectedLocation}
                selectedCategory={selectedCategory}
                onLocationChange={setSelectedLocation}
                onCategoryChange={setSelectedCategory}
                allProducts={mockProducts}
              />
              <div className="mt-3">
                <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {keyword ? (
          filteredProducts.length > 0 ? (
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
                <span className="text-gray-500 text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 mb-4">다른 키워드로 검색해보세요</p>
              <button 
                onClick={() => {
                  setKeyword('');
                  setSelectedLocation('전체');
                  setSelectedCategory('전체');
                  setSearchParams({});
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md"
              >
                필터 초기화
              </button>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-500 text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">검색어를 입력해주세요</h3>
            <p className="text-gray-600">위 검색바에 원하는 액티비티를 검색해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
