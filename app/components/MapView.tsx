'use client';

import { useEffect, useRef } from 'react';

// ✅ TypeScript가 window.naver를 모른다고 해서 빌드가 깨지는 걸 방지
declare global {
  interface Window {
    naver?: any;
  }
}

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
      console.error('NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 없습니다.');
      return;
    }

    if (!Number.isFinite(COMPANY_LAT) || !Number.isFinite(COMPANY_LNG)) {
      console.error('회사 좌표 환경변수(NEXT_PUBLIC_COMPANY_LAT/LNG)가 없습니다.');
      return;
    }

    const initMap = () => {
      if (!mapRef.current) return;
      if (!window.naver || !window.naver.maps) return;

      const center = new window.naver.maps.LatLng(COMPANY_LAT, COMPANY_LNG);

      const map = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 16,
      });

      new window.naver.maps.Marker({
        position: center,
        map,
      });
    };

    // 이미 로드됐으면 바로 초기화
    if (window.naver && window.naver.maps) {
      initMap();
      return;
    }

    // 스크립트 중복 로드 방지
    const existing = document.querySelector(
      'script[data-naver-maps="true"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', initMap);
      return;
    }

    const script = document.createElement('script');
    script.dataset.naverMaps = 'true';
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
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

      <div
        ref={mapRef}
        className="map-view__map"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
