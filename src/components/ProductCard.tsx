import React, { useState, memo } from "react";

interface ProductCardProps {
  product: any;
  onProductClick?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 가격 정보 제거됨

  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product.id);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // 구조화된 데이터 생성
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "category": product.categories.join(", "),
    "brand": {
      "@type": "Brand",
      "name": "TourStream"
    },
    "offers": {
      "@type": "Offer",
      "availability": product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "TourStream"
      }
    },
    "locationCreated": {
      "@type": "Place",
      "name": product.locations.join(", "),
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "KR"
      }
    },
    "keywords": product.tags.join(", ")
  };

  return (
    <>
      {/* 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer group"
        onClick={handleCardClick}
      >
      <div className="p-4">
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between mb-3">
          {/* 카테고리 */}
          <div className="flex gap-1">
            {product.categories.slice(0, 1).map((category: string, idx: number) => (
              <span key={idx} className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                {category}
              </span>
            ))}
          </div>
          
          {/* 찜 버튼 */}
          <button
            onClick={handleLikeClick}
            className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg 
              className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* 제목 */}
        <h2 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h2>

        {/* 설명 */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* 위치 */}
        <div className="flex items-center gap-1 mb-2">
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs text-gray-600">{product.locations[0]}</span>
        </div>

        {/* 태그 (해시태그 스타일) */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 3).map((tag: string, idx: number) => (
            <span key={idx} className="text-xs text-blue-600">
              #{tag}
            </span>
          ))}
        </div>

        {/* 예약 링크 아코디언 */}
        {product.externalUrls && product.externalUrls.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={handleExpandClick}
              className="flex items-center justify-between w-full text-left text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span className="font-medium">
                예약 링크 {product.externalUrls.length}개
              </span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isExpanded && (
              <div className="mt-2 space-y-1">
                {product.externalUrls.map((url: string, idx: number) => {
                  // URL 인덱스에 따른 예약 사이트 이름 매핑
                  const siteNames = ["마이리얼트립", "KLOOK", "KKDAY", "GYG", "트립닷컴"];
                  const siteName = siteNames[idx] || `예약 링크 ${idx + 1}`;
                  
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-gray-600 hover:text-blue-600 py-1 px-2 bg-gray-50 rounded hover:bg-blue-50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {siteName}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default memo(ProductCard); 