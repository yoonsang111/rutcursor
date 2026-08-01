import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { COUNTRIES, CATEGORIES, PRODUCTS } from '../data';
import { ProductCard } from '../components/ProductCard';
import * as Icons from 'lucide-react';

export function Home() {
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    {
      id: 1,
      tag: "기간 한정 특가",
      title: "유니버설 스튜디오 재팬\n슈퍼 얼리버드 티켓",
      desc: "주요 파트너사 가격 비교 완료. 지금 가장 저렴한 가격으로 예약하고 혜택을 받으세요.",
      btnText: "최저가 확인하기",
      link: "/event/usj",
      gradient: "from-slate-900 to-slate-800",
      glow1: "bg-cyan-500/20",
      glow2: "bg-blue-500/20",
      productIdx: 0
    },
    {
      id: 2,
      tag: "오픈 기념 이벤트",
      title: "TOURSTREAM 가입하고\n최대 5만원 쿠폰팩 받기",
      desc: "신규 가입 즉시 지급되는 특별한 쿠폰팩으로 첫 여행을 더 저렴하게 준비하세요.",
      btnText: "쿠폰 받으러 가기",
      link: "/event/coupon",
      gradient: "from-blue-900 to-indigo-900",
      glow1: "bg-purple-500/30",
      glow2: "bg-blue-400/20",
      productIdx: 1
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

  const popularProducts = PRODUCTS.filter(p => p.isPopular);
  const recommendedProducts = PRODUCTS.filter(p => p.isRecommended);

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden">
      
      {/* Unique Hero Section - Smaller Images */}
      <section className="px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-5 z-10">
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">당신의 다음 여행,<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">가장 완벽한 가격</span>으로.</h1>
            
          </div>
          
          <div className="flex-1 w-full relative h-[240px] md:h-[320px]">
            {/* Abstract/Offset Image Composition - Scaled down */}
            <div className="absolute top-0 right-0 w-[80%] h-[90%] rounded-3xl overflow-hidden shadow-xl z-10">
              <img src="https://images.unsplash.com/photo-1612330766532-13be77cca650?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXJmJTIwb2NlYW4lMjB3YXZlc3xlbnwxfHx8fDE3NzY5NzQ2ODV8MA&ixlib=rb-4.1.0&q=80&w=1200" className="w-full h-full object-cover" alt="Hero" />
            </div>
            <div className="absolute bottom-0 left-0 w-[45%] h-[55%] rounded-2xl overflow-hidden shadow-lg border-[3px] border-white z-20">
              <img src="https://images.unsplash.com/photo-1691488822390-0fd80c389953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGFpbGFuZCUyMGJhbmdrb2slMjB0ZW1wbGV8ZW58MXx8fHwxNzc2OTk0Njk3fDA&ixlib=rb-4.1.0&q=80&w=1080" className="w-full h-full object-cover" alt="Hero sub" />
            </div>
            {/* Floating Element */}
            <div className="absolute top-1/2 left-[5%] -translate-y-1/2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg z-30 flex items-center gap-2.5">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Icons.TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">최대 할인율</div>
                <div className="text-base font-extrabold text-slate-900">-45% 발견</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Modern Categories */}
      <section className="px-6 py-8">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {CATEGORIES.map((cat) => {
            const IconComponent = Icons[cat.iconName as keyof typeof Icons] as React.ElementType;
            return (
              <Link to={`/category/${cat.id}`} key={cat.id} className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-100 shadow-sm hover:shadow hover:border-cyan-200 transition-all duration-300">
                <div className="text-slate-400 group-hover:text-cyan-500 transition-colors">
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Smaller 6-Grid for Countries */}
      <section className="px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">인기 여행지</h2>
            <p className="text-slate-500 text-sm mt-1.5">지금 가장 핫한 국가의 투어를 검색해보세요.</p>
          </div>
        </div>
        
        {/* Changed from 3 big items to 6 smaller grid items */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {COUNTRIES.map((country) => (
            <Link 
              to={`/country/${country.id}`} 
              key={country.id} 
              className="relative aspect-square md:aspect-[4/5] rounded-2xl overflow-hidden group block shadow-sm border border-slate-100"
            >
              <img 
                src={country.image} 
                alt={country.name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
              
              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center text-center">
                <h3 className="font-extrabold text-lg text-white mb-1 group-hover:-translate-y-1 transition-transform">{country.name}</h3>
                <span className="text-white/80 text-xs font-medium bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full group-hover:-translate-y-1 transition-transform delay-75">
                  {country.regionCount}개 도시
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Metasearch Products */}
      <section className="py-8 pl-6">
        <div className="flex items-end justify-between pr-6 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">인기 상품</h2>
            <p className="text-slate-500 text-sm mt-1.5">사용자들이 가장 많이 비교하고 예약한 상품입니다.</p>
          </div>
          <Link to="/popular" className="hidden sm:flex items-center gap-1 text-cyan-600 text-sm font-bold hover:text-cyan-700">
            전체보기 <Icons.ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar snap-x pr-6">
          {popularProducts.map((p) => (
            <div key={p.id} className="snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Highlighted Deals */}
      <section className="px-6 py-8">
        <div className={`bg-gradient-to-br ${banners[currentBanner].gradient} rounded-[2rem] p-6 md:p-10 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 transition-colors duration-700`}>
          {/* Navigation Arrows */}
          <button 
            onClick={prevBanner}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-colors border border-white/10"
          >
            <Icons.ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={nextBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-colors border border-white/10"
          >
            <Icons.ChevronRight className="w-5 h-5" />
          </button>

          {/* Pagination dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>

          <div className={`absolute top-0 right-0 w-[300px] h-[300px] ${banners[currentBanner].glow1} rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 transition-colors duration-700`}></div>
          <div className={`absolute bottom-0 left-0 w-[200px] h-[200px] ${banners[currentBanner].glow2} rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 transition-colors duration-700`}></div>

          <div className="flex-1 relative z-10 text-white pl-4 md:pl-8 transition-all duration-500 transform translate-y-0 opacity-100" key={currentBanner}>
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 font-bold text-xs mb-4">
              {banners[currentBanner].tag}
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold mb-4 leading-tight whitespace-pre-line">
              {banners[currentBanner].title}
            </h2>
            <p className="text-slate-300 text-sm md:text-base mb-6 max-w-md">
              {banners[currentBanner].desc}
            </p>
            <Link to={banners[currentBanner].link} className="inline-block bg-white text-slate-900 px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform duration-300">
              {banners[currentBanner].btnText}
            </Link>
          </div>

          <div className="relative z-10 shrink-0 w-[220px] pr-4 md:pr-8 transition-all duration-500 transform opacity-100 scale-100" key={`img-${currentBanner}`}>
            {recommendedProducts[banners[currentBanner].productIdx] && (
               <div className="bg-white p-3 rounded-2xl shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
                 <ProductCard product={recommendedProducts[banners[currentBanner].productIdx]} />
               </div>
            )}
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}