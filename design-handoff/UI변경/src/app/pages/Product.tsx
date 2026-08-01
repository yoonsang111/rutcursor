import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { PRODUCTS, COUNTRIES, CATEGORIES } from '../data';
import { Star, Share, Heart, MapPin, ArrowUpRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = PRODUCTS.find(p => p.id === id);
  const [showAllReviews, setShowAllReviews] = useState(false);

  if (!product) return <div className="p-8 text-center font-bold text-2xl mt-20">상품을 찾을 수 없습니다.</div>;

  const country = COUNTRIES.find(c => c.id === product.countryId);
  const category = CATEGORIES.find(c => c.id === product.categoryId);

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-32 md:pb-12 pt-0 md:pt-8 px-0 md:px-6 relative">
      
      {/* Top Breadcrumb (Desktop) */}
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium mb-6">
        <Link to="/" className="hover:text-cyan-600 cursor-pointer transition-colors">홈</Link>
        <span>/</span>
        <Link to={`/country/${country?.id}`} className="hover:text-cyan-600 cursor-pointer transition-colors">{country?.name}</Link>
        {product.region && (
          <>
            <span>/</span>
            <Link to={`/region/${product.region}`} className="hover:text-cyan-600 cursor-pointer transition-colors">{product.region}</Link>
          </>
        )}
        <span>/</span>
        <Link to={`/category/${category?.id}`} className="hover:text-cyan-600 cursor-pointer transition-colors">{category?.name}</Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* Left Content Area */}
        <div className="flex-1">
          {/* Main Image Grid - Reduced Height */}
          <div className="relative w-full h-[280px] md:h-[400px] md:rounded-3xl overflow-hidden mb-6 shadow-sm">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-cyan-600 transition-colors shadow-md">
                <Share className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-rose-500 transition-colors shadow-md">
                <Heart className="w-4 h-4" />
              </button>
            </div>
            
            
          </div>

          <div className="px-5 md:px-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[11px] rounded-md">
                {category?.name}
              </span>
              <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {country?.name}
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug mb-4 tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-amber-700 text-sm">{product.rating}</span>
                </div>
                <span className="text-slate-500 text-sm font-medium underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-800">
                  {product.reviews.toLocaleString()}개의 리뷰
                </span>
              </div>
            </div>

            <div className="prose prose-slate max-w-none text-sm md:text-base">
              <h2 className="text-xl font-bold text-slate-900 mb-4">상품 설명</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            <div className="mt-8 p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                TOURSTREAM 가격 비교
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-slate-700 mb-0.5">믿을 수 있는 공식 파트너사</div>
                    <div className="text-xs text-slate-500">검증된 공식 예약 플랫폼의 가격을 한눈에 비교합니다.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-slate-700 mb-0.5">실시간 최저가 안내</div>
                    <div className="text-xs text-slate-500">환율 및 예약 시점에 따라 실제 결제 가격이 달라질 수 있습니다.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section (SEO & UX) */}
            <section className="mt-12 pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-900">생생한 후기</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                    <span className="text-lg font-bold text-slate-900">{product.rating}</span>
                  </div>
                  <span className="text-sm text-slate-500">({product.reviews.toLocaleString()}개)</span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* Mock Review 1 */}
                <article className="pb-6 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-700 font-bold text-sm border border-cyan-100">
                      김*수
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">2024. 04. 12 · 플랫폼 예약</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    정말 최고의 경험이었습니다! 가이드님이 너무 친절하시고 설명도 잘해주셔서 시간가는 줄 몰랐네요. 메타서치로 최저가 찾아서 다녀와서 더 기분이 좋습니다. 다음 여행에도 꼭 이용할게요!
                  </p>
                </article>

                {/* Mock Review 2 */}
                <article className="pb-6 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                      이*진
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">2024. 03. 28 · 플랫폼 예약</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    사진에서 본 것과 똑같아요. 여러 사이트 돌아다닐 필요 없이 여기서 한 번에 비교하고 바로 예약할 수 있어서 진짜 편했습니다. 강추합니다!
                  </p>
                </article>

                {/* Mock Review 3 */}
                <article className="pb-6 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                      P*rk
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        {[1, 2, 3, 4].map(star => <Star key={star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                        <Star className="w-3.5 h-3.5 fill-slate-200 text-slate-200" />
                      </div>
                      <div className="text-xs text-slate-400 font-medium">2024. 03. 15 · 플랫폼 예약</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    전체적으로 만족스러웠습니다. 날씨가 조금 흐려서 아쉬웠지만 투어 내용 자체는 아주 알찼어요. 가격 비교해서 저렴하게 잘 샀습니다.
                  </p>
                </article>

                {showAllReviews && (
                  <>
                    {/* Mock Review 4 */}
                    <article className="pb-6 border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm border border-emerald-100">
                          최*호
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">2024. 02. 20 · 플랫폼 예약</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        여러 사이트 비교해보고 여기서 가장 저렴하게 예약했어요. 앱도 깔끔하고 사용하기 편해서 좋네요. 가족 여행이었는데 부모님도 만족해하셨습니다.
                      </p>
                    </article>

                    {/* Mock Review 5 */}
                    <article className="pb-6 border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-700 font-bold text-sm border border-purple-100">
                          정*민
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">2024. 01. 05 · 플랫폼 예약</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        다음에 또 이 지역으로 여행가게 된다면 무조건 재구매각입니다. 주변 지인들에게도 엄청 추천하�� 다녀요!
                      </p>
                    </article>
                  </>
                )}
              </div>

              {!showAllReviews && (
                <button 
                  onClick={() => setShowAllReviews(true)}
                  className="w-full mt-4 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  후기 {product.reviews.toLocaleString()}개 더보기
                </button>
              )}
            </section>
          </div>
        </div>

        {/* Right Sidebar / Bottom bar for Mobile */}
        <div className="lg:w-[320px] shrink-0">
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 
                          lg:sticky lg:top-28 lg:bg-white lg:border lg:rounded-3xl lg:shadow-xl lg:p-6 lg:z-10">
            
            <div className="flex justify-between items-end mb-4 gap-3">
              <div className="flex flex-col">
                <div className="text-cyan-600 text-xs font-bold mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> 실시간 최저가
                </div>
                <div className="flex items-baseline gap-1">
                  <div className="text-xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {product.price.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-slate-500">원~</div>
                </div>
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md mb-1">
                3개 파트너사 비교
              </div>
            </div>

            {/* Partners List */}
            <div className="flex flex-col gap-2 max-h-[160px] lg:max-h-none overflow-y-auto pr-1 -mr-1 
                            scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {[
                { id: 'p1', name: '마이리얼트립', url: product.url, isLowest: true },
                { id: 'p2', name: '클룩', url: product.url, isLowest: false },
                { id: 'p3', name: '투어비스', url: product.url, isLowest: false },
              ].map(partner => (
                <div key={partner.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      {partner.name}
                      {partner.isLowest && <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-sm font-bold">최저가</span>}
                    </span>
                  </div>
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${partner.isLowest ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'}`}
                  >
                    이동
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              ))}
            </div>
            
            <div className="hidden lg:block mt-5 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 text-center leading-relaxed font-medium">
              각 파트너사의 최저가는 환율 및 예약 시점에 따라<br />변동될 수 있습니다.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}