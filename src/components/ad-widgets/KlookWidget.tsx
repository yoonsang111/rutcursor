import React, { useEffect, useRef } from 'react';

interface KlookWidgetProps {
  type: 'deals' | 'dynamic';
  aid?: string;
  adid?: string;
  cid?: string;
  className?: string;
}

const KlookWidget: React.FC<KlookWidgetProps> = ({ 
  type,
  aid,
  adid,
  cid,
  className = ""
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="fetch-iframe-init.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://affiliate.klook.com/widget/fetch-iframe-init.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div ref={widgetRef} className={`klook-widget-container ${className}`}>
      {type === 'deals' && aid && (
        <ins
          className="klk-aff-widget"
          data-aid={aid}
          data-city_id=""
          data-country_id=""
          data-tag_id="0"
          data-currency=""
          data-lang=""
          data-label1=""
          data-label2=""
          data-label3=""
          data-prod="deals_widget"
          data-total="3"
        >
          <a href="//www.klook.com/">Klook.com</a>
        </ins>
      )}
      {type === 'dynamic' && adid && (
        <ins
          className="klk-aff-widget"
          data-adid={adid}
          data-lang=""
          data-currency="KRW"
          data-cardH="126"
          data-padding="92"
          data-lgH="470"
          data-edgeValue="655"
          data-cid={cid || "-1"}
          data-tid="-1"
          data-amount="3"
          data-prod="dynamic_widget"
        >
          <a href="//www.klook.com/">Klook.com</a>
        </ins>
      )}
    </div>
  );
};

export default KlookWidget;

