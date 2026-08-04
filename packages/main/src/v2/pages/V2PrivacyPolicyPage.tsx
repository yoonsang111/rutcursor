import React from "react";
import { useV2Seo } from "../hooks/useV2Seo";

const EFFECTIVE_DATE = "2026년 8월 4일";
const PRIVACY_CONTACT_EMAIL = "todtt2210@gmail.com";

export default function V2PrivacyPolicyPage() {
  useV2Seo({
    title: "개인정보처리방침 | TourStream",
    description: "TourStream 개인정보처리방침",
    canonicalPath: "/privacy",
    ogType: "website",
  });

  return (
    <div className="w-full max-w-[820px] mx-auto px-6 py-10 md:py-14">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">개인정보처리방침</h1>
      <p className="text-sm text-slate-500 mb-10">시행일자: {EFFECTIVE_DATE}</p>

      <div className="prose prose-slate max-w-none text-sm md:text-[15px] leading-relaxed text-slate-700 space-y-8">
        <p>
          주식회사 알유티(이하 "회사")가 운영하는 TourStream(이하 "서비스")은 이용자의 개인정보를 중요시하며,
          「개인정보보호법」 등 관련 법령을 준수하고 있습니다. 회사는 본 개인정보처리방침을 통해 이용자가 제공하는
          개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지
          알려드립니다.
        </p>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">1. 수집하는 개인정보 항목 및 수집방법</h2>
          <p className="mb-2">
            서비스는 별도의 회원가입 절차를 운영하지 않으며, 이용자가 이름·전화번호 등을 직접 입력하는 절차가
            없습니다. 다만 서비스 이용 과정에서 아래 정보가 자동으로 생성되어 수집될 수 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>자동 수집 항목: IP 주소, 쿠키, 방문 일시, 서비스 이용 기록, 접속 로그, 기기정보(브라우저 종류, OS 등)</li>
            <li>수집 방법: 구글 애널리틱스(Google Analytics) 등 웹로그 분석 도구를 통한 자동 수집</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스 이용 통계 분석 및 접속 빈도 파악, 서비스 개선</li>
            <li>어떤 상품·파트너사 링크가 이용자에게 도움이 되었는지 확인하기 위한 이용 패턴 분석</li>
            <li>부정 이용 방지 및 서비스 안정적 운영</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">3. 개인정보의 보유 및 이용기간</h2>
          <p>
            회사는 별도의 개인정보를 저장·관리하지 않으며, 구글 애널리틱스를 통해 자동 수집되는 정보는 구글의
            데이터 보관 정책에 따라 처리됩니다. 이용자는 아래 4항의 방법으로 언제든 쿠키 수집을 거부할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">4. 쿠키(Cookie)의 운영 및 거부</h2>
          <p className="mb-2">
            서비스는 이용자에게 맞춤화된 서비스를 제공하기 위해 쿠키를 사용할 수 있습니다. 이용자는 웹 브라우저
            설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 쿠키 저장을 거부할 경우 일부 서비스 이용에
            어려움이 발생할 수 있습니다.
          </p>
          <p>
            또한 구글 애널리틱스의 데이터 수집을 원치 않으실 경우,{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-semibold underline"
            >
              구글 애널리틱스 차단 브라우저 부가기능
            </a>
            을 설치하여 수집을 거부할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">5. 개인정보의 제3자 제공 및 국외 이전</h2>
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 서비스 이용 통계 분석을 위해
            아래와 같이 구글 애널리틱스(Google LLC, 미국 소재)에 자동 수집 정보 일부가 이전됩니다.
          </p>
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden mt-3">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-semibold bg-slate-50 w-1/4">이전받는 자</td>
                <td className="p-2.5">Google LLC</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-semibold bg-slate-50">이전 목적</td>
                <td className="p-2.5">웹사이트 이용 통계 분석 (Google Analytics)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-semibold bg-slate-50">이전 항목</td>
                <td className="p-2.5">IP 주소, 쿠키 식별자, 서비스 이용 기록</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold bg-slate-50">보유·이용 기간</td>
                <td className="p-2.5">Google의 데이터 보관 정책에 따름</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">6. 파트너사 링크 이용 시 유의사항</h2>
          <p>
            서비스는 여행 상품의 가격을 비교·안내하는 정보 제공 서비스이며, 이용자가 "이동" 등 버튼을 눌러
            마이리얼트립, KLOOK, KKday, GetYourGuide, 트립닷컴 등 파트너사 사이트로 이동한 이후의 예약·결제 및
            그 과정에서 발생하는 개인정보 수집·처리는 각 파트너사의 개인정보처리방침이 적용되며, 회사는 이에
            관여하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">7. 정보주체의 권리와 행사 방법</h2>
          <p>
            이용자는 회사가 보유한 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있으며, 아래
            개인정보 보호책임자 연락처로 문의하시면 지체 없이 조치하겠습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">8. 개인정보의 안전성 확보조치</h2>
          <p>
            회사는 개인정보가 분실, 도난, 유출, 변조 또는 훼손되지 않도록 접근권한 관리, 전송구간 암호화(HTTPS)
            등 합리적인 보안조치를 취하고 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">9. 개인정보 보호책임자</h2>
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-semibold bg-slate-50 w-1/4">회사명</td>
                <td className="p-2.5">주식회사 알유티 (TOURSTREAM)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-semibold bg-slate-50">대표자</td>
                <td className="p-2.5">이윤상</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold bg-slate-50">문의 이메일</td>
                <td className="p-2.5">
                  <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="text-brand font-semibold">
                    {PRIVACY_CONTACT_EMAIL}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">10. 개인정보처리방침의 변경</h2>
          <p>
            본 방침은 법령, 정책 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지사항 또는 본
            페이지를 통해 고지합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
