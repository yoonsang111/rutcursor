import React from "react";
import { useV2Seo } from "../hooks/useV2Seo";

const EFFECTIVE_DATE = "2026년 8월 4일";

export default function V2TermsPage() {
  useV2Seo({
    title: "이용약관 | TourStream",
    description: "TourStream 이용약관",
    canonicalPath: "/terms",
    ogType: "website",
  });

  return (
    <div className="w-full max-w-[820px] mx-auto px-6 py-10 md:py-14">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">이용약관</h1>
      <p className="text-sm text-slate-500 mb-10">시행일자: {EFFECTIVE_DATE}</p>

      <div className="prose prose-slate max-w-none text-sm md:text-[15px] leading-relaxed text-slate-700 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제1조 (목적)</h2>
          <p>
            본 약관은 주식회사 알유티(이하 "회사")가 운영하는 TourStream(이하 "서비스")의 이용과 관련하여 회사와
            이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제2조 (정의)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>"서비스"란 회사가 제공하는 여행 상품(투어, 티켓, 액티비티, 항공권 등) 가격비교 및 정보 제공 서비스를 말합니다.</li>
            <li>"이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
            <li>"파트너사"란 마이리얼트립, KLOOK, KKday, GetYourGuide, 트립닷컴 등 서비스에 상품 정보 및 예약 링크를 제공하는 외부 사업자를 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
          <p>
            본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는
            관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여
            사전 공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제4조 (서비스의 내용)</h2>
          <p className="mb-2">회사는 이용자에게 다음과 같은 서비스를 제공합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>국내외 여행 상품(투어, 티켓, 액티비티) 및 항공권의 파트너사별 가격 정보 비교·제공</li>
            <li>파트너사 예약 페이지로 연결되는 링크 제공</li>
          </ul>
          <p className="mt-2">
            회사는 상품을 직접 판매하거나 예약을 대행하지 않으며, 이용자가 파트너사 링크를 통해 이동한 이후의
            예약, 결제, 취소, 환불 등 거래는 이용자와 파트너사 간에 직접 이루어집니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제5조 (서비스의 변경 및 중단)</h2>
          <p>
            회사는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며,
            이 경우 사전에 공지합니다. 다만 불가피한 사유가 있는 경우 사후에 공지할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제6조 (이용자의 의무)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자는 서비스 이용 시 관계 법령, 본 약관의 규정을 준수해야 합니다.</li>
            <li>이용자는 서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제, 유통, 상업적으로 이용할 수 없습니다.</li>
            <li>이용자는 서비스의 안정적 운영을 방해하는 행위(비정상적인 접근, 크롤링 등)를 해서는 안 됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제7조 (면책조항)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              회사가 제공하는 가격, 재고, 예약 가능 여부 등 상품 정보는 파트너사로부터 제공받은 정보이며, 환율 및
              예약 시점에 따라 실제 파트너사 사이트의 가격과 다를 수 있습니다. 회사는 해당 정보의 완전성, 정확성,
              최신성을 보장하지 않습니다.
            </li>
            <li>
              회사는 이용자와 파트너사 간에 이루어진 거래(예약, 결제, 취소, 환불, 여행 중 발생한 사고 등)에 대해
              책임을 지지 않으며, 관련 분쟁은 이용자와 해당 파트너사가 직접 해결해야 합니다.
            </li>
            <li>
              회사는 천재지변, 파트너사 시스템 장애 등 회사의 통제 범위를 벗어난 사유로 발생한 서비스 이용 장애에
              대해 책임을 지지 않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제8조 (지적재산권)</h2>
          <p>서비스에 게시된 콘텐츠(디자인, 텍스트, 로고 등)에 대한 저작권 및 지적재산권은 회사 또는 정당한 권리자에게 귀속됩니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">제9조 (분쟁해결 및 재판관할)</h2>
          <p>
            본 약관과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 원만한 해결을 위해 노력하며, 소송이 제기될
            경우 대한민국 법을 준거법으로 하고 민사소송법상의 관할법원을 관할 법원으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">부칙</h2>
          <p>본 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
        </section>
      </div>
    </div>
  );
}
