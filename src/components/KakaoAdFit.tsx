import React, { useEffect, useRef } from 'react';

interface KakaoAdFitProps {
  adUnit?: string;
  width?: number;
  height?: number;
  className?: string;
}

const KakaoAdFit: React.FC<KakaoAdFitProps> = ({ 
  adUnit = "DAN-LiVpm1LeY0Ut7fd9",
  width = 300,
  height = 250,
  className = ""
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 스크립트가 이미 로드되었는지 확인
    const existingScript = document.querySelector('script[src*="ba.min.js"]');
    if (existingScript) {
      // 이미 로드된 경우에도 광고 영역을 다시 초기화
      const adElement = adRef.current?.querySelector('.kakao_ad_area');
      if (adElement && (window as any).daum && (window as any).daum.adfit) {
        (window as any).daum.adfit.display(adElement);
      }
      return;
    }

    // 스크립트 동적 로드
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    
    script.onload = () => {
      // 스크립트 로드 후 광고 영역 초기화
      const adElement = adRef.current?.querySelector('.kakao_ad_area');
      if (adElement && (window as any).daum && (window as any).daum.adfit) {
        (window as any).daum.adfit.display(adElement);
      }
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 스크립트를 제거하지 않음 (다른 곳에서 사용할 수 있음)
    };
  }, [adUnit]);

  return (
    <div ref={adRef} className={`kakao-ad-container ${className}`}>
      <ins
        className="kakao_ad_area"
        style={{ display: 'none' }}
        data-ad-unit={adUnit}
        data-ad-width={width}
        data-ad-height={height}
      />
    </div>
  );
};

export default KakaoAdFit;

