import React, { useEffect, useRef } from 'react';

interface KakaoAdFitWidgetProps {
  adUnit: string;
  width?: number;
  height?: number;
  className?: string;
}

const KakaoAdFitWidget: React.FC<KakaoAdFitWidgetProps> = ({ 
  adUnit = "DAN-LiVpm1LeY0Ut7fd9",
  width = 300,
  height = 250,
  className = ""
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="ba.min.js"]');
    if (existingScript) {
      const adElement = adRef.current?.querySelector('.kakao_ad_area');
      if (adElement && (window as any).daum && (window as any).daum.adfit) {
        (window as any).daum.adfit.display(adElement);
      }
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    
    script.onload = () => {
      const adElement = adRef.current?.querySelector('.kakao_ad_area');
      if (adElement && (window as any).daum && (window as any).daum.adfit) {
        (window as any).daum.adfit.display(adElement);
      }
    };

    document.head.appendChild(script);

    return () => {};
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

export default KakaoAdFitWidget;

