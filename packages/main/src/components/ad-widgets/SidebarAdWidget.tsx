import React, { useMemo } from 'react';
import KakaoAdFitWidget from './KakaoAdFitWidget';

interface SidebarAdWidgetProps {
  className?: string;
}

const SidebarAdWidget: React.FC<SidebarAdWidgetProps> = ({ className = "" }) => {
  // 세로형 광고만 (사이드바용)
  const widgets = useMemo(() => [
    {
      id: 'kakao',
      component: <KakaoAdFitWidget adUnit="DAN-LiVpm1LeY0Ut7fd9" className={className} />
    },
  ], [className]);

  // 랜덤으로 하나 선택
  const selectedWidget = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * widgets.length);
    return widgets[randomIndex].component;
  }, [widgets]);

  return (
    <div className={`sidebar-ad-widget-wrapper ${className}`}>
      {selectedWidget}
    </div>
  );
};

export default SidebarAdWidget;

