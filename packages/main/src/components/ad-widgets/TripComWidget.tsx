import React from 'react';

interface TripComWidgetProps {
  adId: string;
  className?: string;
}

const TripComWidget: React.FC<TripComWidgetProps> = ({ 
  adId,
  className = ""
}) => {
  return (
    <div className={`tripcom-widget-container ${className}`}>
      <iframe
        src={`https://kr.trip.com/partners/ad/${adId}?Allianceid=5017790&SID=92571095&trip_sub1=`}
        style={{ width: '728px', height: '90px', border: 'none' }}
        frameBorder={0}
        scrolling="no"
        id={adId}
        title={`Trip.com 광고 ${adId}`}
      />
    </div>
  );
};

export default TripComWidget;

