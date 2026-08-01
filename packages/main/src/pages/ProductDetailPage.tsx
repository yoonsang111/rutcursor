import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🔵 [ProductDetailPage] 컴포넌트 렌더링, ID:', id);

  // API에서 상품 불러오기
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('상품 ID가 없습니다');
        setLoading(false);
        return;
      }

      console.log('🟢 [ProductDetailPage] 상품 로드 시작, ID:', id);
      setLoading(true);
      setError(null);

      try {
        // URL에서 받은 ID로 API 호출
        const productData = await api.getProduct(id);
        console.log('✅ [ProductDetailPage] API 호출 완료:', productData);
        
        if (productData) {
          // 상세 진입 시 조회수 1 증가 (실패해도 페이지는 정상 노출)
          api.incrementProductView(id).catch(() => null);

          const cleanedProduct = {
            ...productData,
            images: []
          };
          console.log('✅ [ProductDetailPage] 상품 설정 완료:', cleanedProduct.name);
          setProduct(cleanedProduct);
        } else {
          console.error('❌ [ProductDetailPage] 상품을 찾을 수 없음, ID:', id);
          setError('상품을 찾을 수 없습니다');
        }
      } catch (error: any) {
        console.error('❌ [ProductDetailPage] 상품 로드 실패:', error);
        setError('상품을 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // SEO 메타태그 설정
  useEffect(() => {
    if (!product) return;

    // SEO 메타태그 데이터
    const seoData = (product as any).seo || {
      title: `${product.name} | TourStream`,
      description: `${product.description} TourStream에서 예약하세요!`,
      keywords: `${product.name}, ${(product.locations || []).join(', ')}, ${(product.categories || []).join(', ')}, 예약, 할인`
    };

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

    // canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `https://tourstream.kr/product/${product.id}`);

    // 컴포넌트 언마운트 시 원래 제목으로 복원
    return () => {
      document.title = "TourStream - 전세계 투어 가격 비교 및 예약 플랫폼";
    };
  }, [product, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">상품을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">상품을 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">{error || '요청하신 상품이 존재하지 않습니다.'}</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50">
      {/* 구조화된 데이터 (Product Schema) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify((() => {
            const productPrice = product.price ?? product.minPrice ?? product.salePrice;
            const productImage = (product.images && product.images[0]) || product.image || null;
            const productDescription = product.description || `${product.name} 여행 상품을 여러 예약 사이트에서 최저가로 비교하세요.`;
            return {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": product.name,
              "description": productDescription,
              "image": productImage,
              "url": `https://tourstream.kr/product/${product.id}`,
              "category": (product.categories || []).join(", "),
              "brand": {
                "@type": "Brand",
                "name": "TourStream"
              },
              "offers": {
                "@type": "Offer",
                "priceCurrency": "KRW",
                ...(productPrice != null ? { "price": productPrice } : {
                  "priceSpecification": {
                    "@type": "PriceSpecification",
                    "priceCurrency": "KRW"
                  }
                }),
                "availability": product.isAvailable !== false
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                "url": product.externalUrl1 || `https://tourstream.kr/product/${product.id}`,
                "seller": {
                  "@type": "Organization",
                  "name": "TourStream",
                  "url": "https://tourstream.kr"
                },
                "hasMerchantReturnPolicy": {
                  "@type": "MerchantReturnPolicy",
                  "applicableCountry": "KR",
                  "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                  "merchantReturnDays": 7,
                  "returnMethod": "https://schema.org/ReturnByMail",
                  "returnFees": "https://schema.org/FreeReturn"
                },
                "shippingDetails": {
                  "@type": "OfferShippingDetails",
                  "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": "0",
                    "currency": "KRW"
                  },
                  "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "KR"
                  },
                  "deliveryTime": {
                    "@type": "ShippingDeliveryTime",
                    "handlingTime": {
                      "@type": "QuantitativeValue",
                      "minValue": 0,
                      "maxValue": 0,
                      "unitCode": "DAY"
                    },
                    "transitTime": {
                      "@type": "QuantitativeValue",
                      "minValue": 0,
                      "maxValue": 0,
                      "unitCode": "DAY"
                    }
                  }
                }
              },
              "keywords": (product.tags || []).join(", ")
            };
          })())
        }}
      />
      
      {/* BreadcrumbList 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "홈",
                "item": "https://tourstream.kr"
              },
              ...(product.categories && product.categories.length > 0 ? [{
                "@type": "ListItem",
                "position": 2,
                "name": product.categories[0],
                "item": `https://tourstream.kr/category/${encodeURIComponent(product.categories[0])}`
              }] : []),
              {
                "@type": "ListItem",
                "position": product.categories && product.categories.length > 0 ? 3 : 2,
                "name": product.name,
                "item": `https://tourstream.kr/product/${product.id}`
              }
            ]
          })
        }}
      />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-all duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
        </div>

        {/* 상품 이미지 (있는 경우만 표시) */}
        {(() => {
          const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
          const isValidImage = imageUrl && 
            imageUrl.trim() !== '' && 
            !imageUrl.includes('via.placeholder.com') &&
            !imageUrl.includes('placeholder.com');
          
          return isValidImage ? (
            <div className="mb-6">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-64 md:h-80 object-cover rounded-xl shadow-lg"
                onError={(e) => {
                  e.currentTarget.parentElement?.remove();
                }}
              />
            </div>
          ) : null;
        })()}

        {/* 상품 정보 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/50 mb-6">
          {/* 카테고리 */}
          {product.categories && product.categories.length > 0 && (
            <div className="flex gap-2 mb-3">
              {product.categories.map((category: string, idx: number) => (
                <Link
                  key={idx}
                  to={`/category/${encodeURIComponent(category)}`}
                  className="text-sm bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-700 px-3 py-1.5 rounded-lg font-medium hover:from-sky-200 hover:to-cyan-200 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          )}

          {/* 상품명 */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {product.name}
          </h1>

          {/* 설명 */}
          <p className="text-base text-gray-600 mb-4 leading-relaxed">
            {product.description}
          </p>

          {/* 위치 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">위치</p>
              <div className="flex flex-wrap gap-1">
                {product.locations && product.locations.length > 0 ? (
                  product.locations.map((location: string, idx: number) => (
                    <Link
                      key={idx}
                      to={`/location/${encodeURIComponent(location)}`}
                      className="text-gray-900 font-medium hover:text-sky-600 transition-colors"
                    >
                      {location}
                      {idx < product.locations.length - 1 && ', '}
                    </Link>
                  ))
                ) : (
                  <span className="text-gray-900 font-medium">지역 정보 없음</span>
                )}
              </div>
            </div>
          </div>

          {/* 예약 링크 */}
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
            <div className="border-t border-gray-200/50 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">예약하기</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className="block p-4 bg-gradient-to-br from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100 rounded-xl border border-sky-200/50 hover:border-sky-300 transition-all duration-200 group text-center shadow-sm hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                      <span className="text-white text-sm font-bold">{name.charAt(0)}</span>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">{name}</div>
                    <div className="text-sm text-sky-600">예약하기</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
