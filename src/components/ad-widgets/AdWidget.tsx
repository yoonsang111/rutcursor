import React, { useMemo } from 'react';
import KakaoAdFitWidget from './KakaoAdFitWidget';
import TripComWidget from './TripComWidget';
import AgodaWidget from './AgodaWidget';

interface AdWidgetProps {
  className?: string;
}

const AdWidget: React.FC<AdWidgetProps> = ({ className = "" }) => {
  // 상품 리스트 중간 삽입용 광고 (카카오애드핏, Trip.com, Agoda)
  const widgets = useMemo(() => [
    {
      id: 'kakao',
      component: <KakaoAdFitWidget adUnit="DAN-LiVpm1LeY0Ut7fd9" className={className} />
    },
    {
      id: 'trip1',
      component: <TripComWidget adId="DB6175843" className={className} />
    },
    {
      id: 'trip2',
      component: <TripComWidget adId="SB6175857" className={className} />
    },
    {
      id: 'agoda',
      component: <AgodaWidget className={className} />
    }
  ], [className]);

  // 랜덤으로 하나 선택
  const selectedWidget = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * widgets.length);
    return widgets[randomIndex].component;
  }, [widgets]);

  return (
    <div className={`ad-widget-wrapper ${className}`}>
      {selectedWidget}
    </div>
  );
};

export default AdWidget;

