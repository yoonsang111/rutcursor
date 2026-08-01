import React from "react";
import { useParams, Link } from "react-router-dom";
import { Gift, Download, CheckCircle2 } from "lucide-react";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2EventPage() {
  const { eventId } = useParams();
  const isCouponEvent = eventId === "coupon";

  useV2Seo({
    title: isCouponEvent ? "쿠폰 이벤트 | TourStream" : "이벤트 | TourStream",
    description: isCouponEvent ? "TourStream 쿠폰 이벤트 페이지입니다." : "TourStream 이벤트 안내 페이지입니다.",
    canonicalPath: `/event/${eventId || ""}`,
    robots: "noindex, follow",
    ogType: "article",
  });

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

  const coupons = [
    { id: 1, targetCategory: "투어/액티비티 전용", amount: "30,000", title: "오픈 기념 메인 쿠폰", condition: "20만원 이상 결제 시 사용 가능", validity: "발급일로부터 30일" },
    { id: 2, targetCategory: "티켓/패스 전용", amount: "20,000", title: "첫 구매 특별 지원", condition: "10만원 이상 결제 시 사용 가능", validity: "발급일로부터 30일" },
  ];

  return (
    <div className="w-full">
      <div className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 text-white relative overflow-hidden py-16 md:py-24 px-6 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 font-bold text-sm mb-6">
            <Gift className="w-4 h-4" />
            <span>오픈 기념 특별 혜택</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            가입만 해도 쏟아지는
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">최대 5만원 쿠폰팩</span>
          </h1>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-center">
              <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 border-dashed">
                <span className="text-slate-500 font-bold mb-2">{coupon.targetCategory}</span>
                <div className="flex items-baseline gap-1 text-cyan-600">
                  <span className="text-4xl font-black">{coupon.amount}</span>
                  <span className="text-xl font-bold">원</span>
                </div>
              </div>
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
            </div>
          ))}
        </div>
      </div>

      <div className="w-full bg-slate-50 border-t border-slate-100 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            유의사항
          </h4>
          <ul className="text-sm text-slate-500 space-y-2 list-disc pl-5 marker:text-slate-300">
            <li>본 쿠폰은 신규 가입 회원에게 1회에 한해 발급됩니다.</li>
            <li>일부 파트너사 상품은 쿠폰 적용이 제한될 수 있습니다.</li>
            <li>쿠폰은 유효기간 만료 시 재발급이 불가합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
