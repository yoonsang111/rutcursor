import React, { useEffect } from 'react';

interface AgodaWidgetProps {
  widgetId?: string;
  className?: string;
}

const AgodaWidget: React.FC<AgodaWidgetProps> = ({ 
  widgetId = "adgshp-1998714363",
  className = ""
}) => {
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="init-dynamic_v8.min.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//cdn0.agoda.net/images/sherpa/js/init-dynamic_v8.min.js';
      document.head.appendChild(script);
      
      script.onload = () => {
        if ((window as any).AgdDynamic) {
          const stg = new Object() as any;
          stg.crt = "2637861088258";
          stg.version = "1.05";
          stg.id = stg.name = widgetId;
          stg.Width = "787px";
          stg.Height = "97px";
          stg.RefKey = "5Weby18UPnor/LU8KYuVJg==";
          stg.AutoScrollSpeed = 3000;
          stg.AutoScrollToggle = true;
          stg.SearchboxShow = false;
          stg.DiscountedOnly = true;
          stg.Layout = "widedynamic";
          stg.Language = "en-us";
          stg.ApiKey = "dd7afb59-d01a-451f-9b6b-a893f9fa57ee";
          stg.Cid = "1935183";
          stg.City = "9590";
          stg.Currency = "KRW";
          stg.OverideConf = false;
          new (window as any).AgdDynamic(widgetId).initialize(stg);
        }
      };
    } else {
      // 스크립트가 이미 로드된 경우에도 초기화
      if ((window as any).AgdDynamic) {
        const stg = new Object() as any;
        stg.crt = "2637861088258";
        stg.version = "1.05";
        stg.id = stg.name = widgetId;
        stg.Width = "787px";
        stg.Height = "97px";
        stg.RefKey = "5Weby18UPnor/LU8KYuVJg==";
        stg.AutoScrollSpeed = 3000;
        stg.AutoScrollToggle = true;
        stg.SearchboxShow = false;
        stg.DiscountedOnly = true;
        stg.Layout = "widedynamic";
        stg.Language = "en-us";
        stg.ApiKey = "dd7afb59-d01a-451f-9b6b-a893f9fa57ee";
        stg.Cid = "1935183";
        stg.City = "9590";
        stg.Currency = "KRW";
        stg.OverideConf = false;
        new (window as any).AgdDynamic(widgetId).initialize(stg);
      }
    }
  }, [widgetId]);

  return (
    <div className={`agoda-widget-container ${className}`}>
      <div id={widgetId} />
    </div>
  );
};

export default AgodaWidget;

