import React, { useState, memo } from "react";

interface ProductCardProps {
  product: any;
  onProductClick?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product.id);
    }
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-blue-200 group cursor-pointer" onClick={handleCardClick}>
        {/* 상품 정보 */}
        <div className="p-4">
          {/* 카테고리 태그 */}
          <div className="flex gap-1.5 mb-2">
            {product.categories.slice(0, 2).map((category: string, idx: number) => (
              <span key={idx} className="text-xs bg-gradient-to-r from-red-100 to-red-200 text-red-700 px-2 py-1 rounded-lg font-medium">
                {category}
              </span>
            ))}
          </div>

          {/* 상품명 */}
          <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {product.name}
          </h3>

          {/* 설명 */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* 위치 정보 */}
          <div className="flex items-center gap-1.5 mb-3">
            <svg className="h-3 w-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-500">{product.locations.join(", ")}</span>
          </div>

          {/* 태그 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.slice(0, 2).map((tag: string, idx: number) => (
              <span key={idx} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                #{tag}
              </span>
            ))}
            {product.tags.length > 2 && (
              <span className="text-xs text-gray-400 px-2 py-0.5">
                +{product.tags.length - 2}개
              </span>
            )}
          </div>
        </div>

        {/* 예약 링크 섹션 */}
        {(() => {
          const externalUrls = [
            (product as any).externalUrl1,
            (product as any).externalUrl2,
            (product as any).externalUrl3,
            (product as any).externalUrl4,
            (product as any).externalUrl5
          ].filter(url => url && url.trim() !== '');
          return externalUrls.length > 0;
        })() && (
          <div className="border-t border-gray-200/50 bg-gray-50/30">
            <button
              onClick={handleExpandClick}
              className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    예약 링크 {[
                      (product as any).externalUrl1,
                      (product as any).externalUrl2,
                      (product as any).externalUrl3,
                      (product as any).externalUrl4,
                      (product as any).externalUrl5
                    ].filter(url => url && url.trim() !== '').length}개
                  </span>
                  <p className="text-xs text-gray-500">클릭하여 확인</p>
                </div>
              </div>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
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
              <div className="px-3 pb-3 space-y-1.5">
                {[
                  { url: (product as any).externalUrl1, name: "마이리얼트립" },
                  { url: (product as any).externalUrl2, name: "KLOOK" },
                  { url: (product as any).externalUrl3, name: "KKDAY" },
                  { url: (product as any).externalUrl4, name: "GetYourGuide" },
                  { url: (product as any).externalUrl5, name: "트립닷컴" }
                ]
                .filter(({ url }) => url && url.trim() !== '')
                .map(({ url, name }, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-md flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover/link:text-red-600 transition-colors">
                          {name}
                        </span>
                      </div>
                      <svg className="h-3 w-3 text-gray-400 group-hover/link:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default memo(ProductCard);