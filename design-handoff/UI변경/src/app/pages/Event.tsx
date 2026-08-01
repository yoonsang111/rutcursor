import React from 'react';
import { useParams, Link } from 'react-router';
import { Gift, ChevronRight, Download, CheckCircle2 } from 'lucide-react';

export function Event() {
  const { eventId } = useParams();

  // 프론트엔드 단독 구현을 위한 임시 목데이터 (나중에 Supabase 등 백엔드에서 불러오게 될 데이터입니다)
  const [coupons, setCoupons] = React.useState([
    {
      id: 1,
      targetCategory: '투어/액티비티 전용',
      amount: '30,000',
      title: '오픈 기념 메인 쿠폰',
      condition: '20만원 이상 결제 시 사용 가능',
      validity: '발급일로부터 30일'
    },
    {
      id: 2,
      targetCategory: '티켓/패스 전용',
      amount: '20,000',
      title: '첫 구매 특별 지원',
      condition: '10만원 이상 결제 시 사용 가능',
      validity: '발급일로부터 30일'
    }
  ]);

  // 현재는 쿠폰 이벤트 페이지만 디자인되어 있으므로, 
  // eventId가 usj와 같이 다른 값이어도 임시로 쿠폰 페이지 혹은 준비 중 페이지를 보여줍니다.
  const isCouponEvent = eventId === 'coupon';

  if (!isCouponEvent) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">현재 준비 중인 이벤트입니다.</h1>
        <p className="text-slate-500 mb-8">더 좋은 혜택으로 찾아오겠습니다.</p>
        <Link to="/" className="inline-block px-8 py-3 bg-cyan-600 text-white font-bold rounded-full hover:bg-cyan-700 transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Event Hero Banner */}
      <div className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 text-white relative overflow-hidden py-16 md:py-24 px-6 text-center">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-purple-500/30 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 font-bold text-sm mb-6">
            <Gift className="w-4 h-4" />
            <span>오픈 기념 특별 혜택</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            가입만 해도 쏟아지는<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
              최대 5만원 쿠폰팩
            </span>
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 font-medium">
            TOURSTREAM 신규 회원가입 시, 첫 결제부터 할인받을 수 있는 쿠폰을 즉시 지급해 드립니다.
          </p>
        </div>
      </div>

      {/* Coupon List Section */}
      <div className="w-full max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-center">
              {/* Left side (Discount Amount) */}
              <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 border-dashed">
                <span className="text-slate-500 font-bold mb-2">{coupon.targetCategory}</span>
                <div className="flex items-baseline gap-1 text-cyan-600">
                  <span className="text-4xl font-black">{coupon.amount}</span>
                  <span className="text-xl font-bold">원</span>
                </div>
              </div>
              
              {/* Right side (Details & Action) */}
              <div className="w-full md:w-2/3 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">{coupon.title}</h3>
                  <p className="text-slate-500 text-sm">{coupon.condition}</p>
                  <div className="mt-3 text-xs text-slate-400">유효기간: {coupon.validity}</div>
                </div>
                <button className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-full font-bold hover:bg-cyan-700 transition-colors shadow-md hover:shadow-lg">
                  <Download className="w-4 h-4" />
                  <span>쿠폰 받기</span>
                </button>
              </div>
              {/* Scallop details for realistic coupon look */}
              <div className="hidden md:block absolute top-[-10px] left-1/3 w-5 h-5 bg-white rounded-full border-b border-slate-200 -translate-x-1/2"></div>
              <div className="hidden md:block absolute bottom-[-10px] left-1/3 w-5 h-5 bg-white rounded-full border-t border-slate-200 -translate-x-1/2"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Notice Section */}
      <div className="w-full bg-slate-50 border-t border-slate-100 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            유의사항
          </h4>
          <ul className="text-sm text-slate-500 space-y-2 list-disc pl-5 marker:text-slate-300">
            <li>본 쿠폰은 TOURSTREAM 신규 가입 회원에게 1회에 한해 자동 지급 또는 다운로드 가능합니다.</li>
            <li>일부 파트너사 상품의 경우, 자체 정책에 따라 쿠폰 적용이 제한될 수 있습니다.</li>
            <li>쿠폰 유효기간이 만료되면 재발급이 불가하오니 기간 내에 사용해 주시기 바랍니다.</li>
            <li>이벤트는 당사 사정에 의해 사전 고지 없이 조기 종료되거나 변경될 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}