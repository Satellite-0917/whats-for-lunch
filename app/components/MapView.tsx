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

    // ✅ TypeScript 빌드 에러 방지: window.naver를 any로 안전하게 사용
    const naver = (window as any).naver;
    if (!naver || !naver.maps) return;

    const companyLat = Number(process.env.NEXT_PUBLIC_COMPANY_LAT);
    const companyLng = Number(process.env.NEXT_PUBLIC_COMPANY_LNG);

    if (!Number.isFinite(companyLat) || !Number.isFinite(companyLng)) return;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(companyLat, companyLng),
      zoom: 15,
    });

    // 🏢 회사(시작점) 마커
    new naver.maps.Marker({
      position: new naver.maps.LatLng(companyLat, companyLng),
      map,
      title: '회사 (시작점)',
      icon: {
        content: `
          <div style="
            font-size: 28px;
            line-height: 1;
            transform: translate(-50%, -100%);
            user-select: none;
          ">🏢</div>
        `,
        anchor: new naver.maps.Point(0, 0),
      },
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
