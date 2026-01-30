'use client';

import { useEffect, useRef } from 'react';

type MapViewProps = {
  title: string;
  subtitle: string;
  selectedName?: string;
  markerCount: number;
};

const COMPANY_LAT = Number(process.env.NEXT_PUBLIC_COMPANY_LAT);
const COMPANY_LNG = Number(process.env.NEXT_PUBLIC_COMPANY_LNG);
const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

export default function MapView({
  title,
  subtitle,
  selectedName,
  markerCount,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!NAVER_MAP_CLIENT_ID) {
      console.error('네이버 지도 Client ID가 없습니다.');
      return;
    }

    // 이미 스크립트가 로드되어 있으면 다시 로드하지 않음
    if (window.naver && window.naver.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    function initMap() {
      if (!mapRef.current || !window.naver) return;

      const center = new window.naver.maps.LatLng(COMPANY_LAT, COMPANY_LNG);

      const map = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 16,
      });

      new window.naver.maps.Marker({
        position: center,
        map,
      });
    }
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

      {/* 👇 여기가 진짜 지도 */}
      <div
        ref={mapRef}
        className="map-view__map"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
