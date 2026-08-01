import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { storage } from "../utils/storage";
import { extractProductIdFromSlug } from "../utils/slug";
import { api } from "../utils/api";
import Footer from "../components/Footer";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // API에서 상품 불러오기
  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('[ProductDetailPage] 상품 로드 시작...');
        const apiProducts = await api.getProducts();
        console.log('[ProductDetailPage] API에서 받은 상품 수:', apiProducts.length);
        // API에서 받은 상품만 사용 (mock 데이터 제거)
        const cleanedProducts = apiProducts.map((product: any) => ({
          ...product,
          images: []
        }));
        console.log('[ProductDetailPage] 상품 설정:', cleanedProducts.length, '개');
        setAllProducts(cleanedProducts);
      } catch (error) {
        console.error('[ProductDetailPage] 상품 로드 실패:', error);
        // API 실패 시 빈 배열
        setAllProducts([]);
      }
    };
    
    loadProducts();
  }, []);

  // 상품 찾기 (slug에서 ID 추출)
  useEffect(() => {
    if (slug && allProducts.length > 0) {
      // slug는 URL 인코딩되어 있을 수 있으므로 디코딩
      let decodedSlug = slug;
      try {
        decodedSlug = decodeURIComponent(slug);
      } catch (e) {
        // 디코딩 실패 시 원본 사용
        decodedSlug = slug;
      }
      
      // slug에서 ID 추출 (6자리 번호 또는 기존 형식)
      let productId = extractProductIdFromSlug(decodedSlug);
      
      if (productId) {
        // 6자리 번호로 상품 찾기
        let foundProduct = allProducts.find(p => p.id === productId);
        
        // 기존 product_X 형식도 지원 (하위 호환성)
        if (!foundProduct && decodedSlug.startsWith('product_')) {
          foundProduct = allProducts.find(p => p.id === decodedSlug);
        }
        
        setProduct(foundProduct);
      } else {
        // slug 전체를 ID로 시도 (하위 호환성)
        const foundProduct = allProducts.find(p => p.id === decodedSlug || p.id === slug);
        setProduct(foundProduct);
      }
    }
  }, [slug, allProducts]);

  useEffect(() => {
    if (!product) {
      // 상품을 찾을 수 없으면 3초 후 홈으로 리다이렉트
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }

    // SEO 메타태그 데이터
    const seoData = (product as any).seo || {
      title: `${product.name} | TourStream`,
      description: `${product.description} TourStream에서 예약하세요!`,
      keywords: `${product.name}, ${product.locations.join(', ')}, ${product.categories.join(', ')}, 예약, 할인`
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
    if (ogUrl && slug) ogUrl.setAttribute('content', `https://tourstream.kr/product/${slug}`);

    // 컴포넌트 언마운트 시 원래 제목으로 복원
    return () => {
      document.title = "TourStream - 최고의 투어 상품 검색";
    };
  }, [product, navigate]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">상품을 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">잠시 후 홈으로 이동합니다...</p>
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
          // placeholder URL이나 빈 문자열은 제외
          const isValidImage = imageUrl && 
            imageUrl.trim() !== '' && 
            !imageUrl.includes('via.placeholder.com') &&
            !imageUrl.includes('placeholder.com');
          
          return isValidImage ? (
            <div className="mb-6">
              <div className="w-full h-64 md:h-80 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl shadow-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.parentElement?.parentElement?.remove();
                  }}
                />
              </div>
            </div>
          ) : null;
        })()}

        {/* 상품 정보 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/50 mb-6">
          {/* 카테고리 */}
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
                {product.locations.map((location: string, idx: number) => (
                  <Link
                    key={idx}
                    to={`/location/${encodeURIComponent(location)}`}
                    className="text-gray-900 font-medium hover:text-sky-600 transition-colors"
                  >
                    {location}
                    {idx < product.locations.length - 1 && ', '}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 운영 기간 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">운영 기간</p>
              <p className="text-gray-900 font-medium">상시 운영</p>
            </div>
          </div>

          {/* 태그 */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {product.tags.map((tag: string, idx: number) => (
              <span key={idx} className="text-sm text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
                #{tag}
              </span>
            ))}
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
      
      <Footer />
    </div>
  );
}
