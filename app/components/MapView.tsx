'use client';

import { useEffect, useRef } from 'react';

type MapViewProps = {
  title: string;
  subtitle: string;
  selectedName?: string;
  markerCount: number;
};

export default function MapView({
  title,
  subtitle,
  selectedName,
  markerCount,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!window.naver) return;

    const companyLat = Number(process.env.NEXT_PUBLIC_COMPANY_LAT);
    const companyLng = Number(process.env.NEXT_PUBLIC_COMPANY_LNG);

    // 지도 생성
    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(companyLat, companyLng),
      zoom: 15,
    });

    // 🏢 회사(시작점) 마커
    new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(companyLat, companyLng),
      map,
      icon: {
        content: `
          <div style="
            font-size: 28px;
            line-height: 1;
            transform: translate(-50%, -100%);
          ">
            🏢
          </div>
        `,
        anchor: new window.naver.maps.Point(0, 0),
      },
      title: '회사 (시작점)',
    });
  }, []);

  return (
    <div className="map-view">
      <div className="map-view__overlay">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <span>{markerCount}개 마커 표시 중</span>
        {selectedName && (
          <span className="map-view__selected">선택됨: {selectedName}</span>
        )}
      </div>

      {/* 지도 영역 */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
        }}
      />
    </div>
  );
}
