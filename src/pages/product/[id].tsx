import React, { useEffect } from "react";
import { products as mockProducts } from "../../mock/products";
import Footer from "../../components/Footer";

interface ProductDetailProps {
  params: {
    id: string;
  };
}

export default function ProductDetail({ params }: ProductDetailProps) {
  const product = mockProducts.find(p => p.id === params.id);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">상품을 찾을 수 없습니다</h1>
          <a href="/" className="text-blue-600 hover:text-blue-700">홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  // SEO 메타태그 데이터
  const seoData = (product as any).seo || {
    title: `${product.name} | TourStream`,
    description: `${product.description} TourStream에서 예약하세요!`,
    keywords: `${product.name}, ${product.locations.join(', ')}, ${product.categories.join(', ')}, 예약, 할인`
  };

  // 동적 SEO 메타태그 설정
  useEffect(() => {
    // 페이지 제목 설정
    document.title = seoData.title;
    
    // 메타 설명 설정
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', seoData.description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', seoData.description);
      document.head.appendChild(metaDescription);
    }
    
    // 메타 키워드 설정
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', seoData.keywords);
    } else {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      metaKeywords.setAttribute('content', seoData.keywords);
      document.head.appendChild(metaKeywords);
    }

    // Open Graph 메타태그 설정
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', seoData.title);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', seoData.description);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://tourstream.kr/product/${product.id}`);

    // 컴포넌트 언마운트 시 원래 제목으로 복원
    return () => {
      document.title = "TourStream - 최고의 투어 상품 검색";
    };
  }, [seoData, product.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* 구조화된 데이터 (Product Schema) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
          })
        }}
      />
      
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <a 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로 돌아가기
          </a>
        </div>

        {/* 상품 이미지 */}
        <div className="mb-6">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-64 md:h-80 object-cover rounded-xl shadow-lg"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Tour+Image';
            }}
          />
        </div>

        {/* 상품 정보 */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          {/* 카테고리 */}
          <div className="flex gap-2 mb-3">
            {product.categories.map((category, idx) => (
              <span key={idx} className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                {category}
              </span>
            ))}
          </div>

          {/* 상품명 */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {product.name}
          </h1>

          {/* 설명 */}
          <p className="text-gray-600 mb-4 leading-relaxed">
            {product.description}
          </p>

          {/* 위치 */}
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-600">{product.locations.join(", ")}</span>
          </div>

          {/* 운영 기간 */}
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-600">상시 운영</span>
          </div>

          {/* 태그 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.tags.map((tag, idx) => (
              <span key={idx} className="text-sm text-blue-600">
                #{tag}
              </span>
            ))}
          </div>

          {/* 예약 링크 */}
          {product.externalUrls && product.externalUrls.filter(url => url && url.trim() !== '').length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">예약하기</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.externalUrls
                  .map((url: string, idx: number) => ({ url, idx }))
                  .filter(({ url }: { url: string }) => url && url.trim() !== '')
                  .map(({ url, idx }: { url: string; idx: number }) => {
                    const siteNames = ["마이리얼트립", "KLOOK", "KKDAY", "GetYourGuide", "트립닷컴"];
                    const siteName = siteNames[idx] || `예약 링크 ${idx + 1}`;
                    
                    return (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-center"
                      >
                        <div className="font-medium text-blue-900">{siteName}</div>
                        <div className="text-sm text-blue-600 mt-1">예약하기</div>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}