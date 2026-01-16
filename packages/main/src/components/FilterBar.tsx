import React from "react";

interface FilterBarProps {
  selectedLocation: string;
  selectedCategory: string;
  onLocationChange: (location: string) => void;
  onCategoryChange: (category: string) => void;
  allProducts?: any[]; // 상품 데이터를 받아서 동적으로 필터 생성
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedLocation,
  selectedCategory,
  onLocationChange,
  onCategoryChange,
  allProducts = []
}) => {
  // 상품 데이터에서 실제 지역과 카테고리 추출
  const allLocations = Array.from(new Set(
    allProducts.flatMap(product => product.locations || [])
  )).filter(Boolean);
  
  const allCategories = Array.from(new Set(
    allProducts.flatMap(product => product.categories || [])
  )).filter(Boolean);

  // 기본값과 실제 데이터 결합
  const locations = ["전체", ...allLocations.slice(0, 8)]; // 최대 8개
  const categories = ["전체", ...allCategories.slice(0, 6)]; // 최대 6개

  return (
    <div className="space-y-4">
      {/* 지역 필터 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          지역
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {locations.map((location) => (
            <button
              key={location}
              onClick={() => onLocationChange(location)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                selectedLocation === location
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-300 hover:border-red-300 shadow-sm'
              }`}
            >
              {location}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          카테고리
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-300 hover:border-red-300 shadow-sm'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar; 