import React, { useEffect } from 'react';

interface KKdayWidgetProps {
  oid: string;
  amount?: number;
  className?: string;
}

const KKdayWidget: React.FC<KKdayWidgetProps> = ({ 
  oid,
  amount = 3,
  className = ""
}) => {
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="iframe.init.1.0.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://kkpartners.kkday.com/iframe.init.1.0.js';
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className={`kkday-widget-container ${className}`}>
      <ins
        className="kkday-product-media"
        data-oid={oid}
        data-amount={amount}
        data-origin="https://kkpartners.kkday.com"
      />
    </div>
  );
};

export default KKdayWidget;

