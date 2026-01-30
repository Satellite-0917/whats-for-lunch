'use client';

import { useEffect, useMemo, useRef } from 'react';

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

export default function MapView({ title, subtitle, selectedName, markerCount }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const companyMarkerRef = useRef<any>(null);

  const ncpKeyId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const companyLat = Number(process.env.NEXT_PUBLIC_COMPANY_LAT ?? '37.507520');
  const companyLng = Number(process.env.NEXT_PUBLIC_COMPANY_LNG ?? '127.055055');

  // ✅ 작은 "회사(빌딩)" 아이콘 SVG (핀처럼 작게 보이도록)
  const companyIconUrl = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <defs>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.25"/>
          </filter>
        </defs>
        <!-- 바닥 원 -->
        <circle cx="14" cy="14" r="12" fill="white" filter="url(#s)"/>
        <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(0,0,0,0.12)"/>
        <!-- 빌딩 -->
        <g transform="translate(8,6)">
          <rect x="0" y="4" width="12" height="14" rx="2" fill="#2D7FF9"/>
          <rect x="3" y="0" width="6" height="18" rx="2" fill="#1F5FCC"/>
          <!-- 창문 -->
          <g fill="rgba(255,255,255,0.9)">
            <rect x="1.8" y="6" width="2" height="2" rx="0.4"/>
            <rect x="8.2" y="6" width="2" height="2" rx="0.4"/>
            <rect x="1.8" y="10" width="2" height="2" rx="0.4"/>
            <rect x="8.2" y="10" width="2" height="2" rx="0.4"/>
            <rect x="1.8" y="14" width="2" height="2" rx="0.4"/>
            <rect x="8.2" y="14" width="2" height="2" rx="0.4"/>
          </g>
        </g>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, []);

  useEffect(() => {
    // 환경변수 없으면 바로 안내(지금은 너는 이미 넣었지만, 안전장치)
    if (!ncpKeyId) return;

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        // 이미 로드돼 있으면 끝
        if (window.naver?.maps) return resolve();

        // 중복 삽입 방지
        const existing = document.querySelector('script[data-naver-maps="true"]') as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Failed to load Naver Maps script')));
          return;
        }

        const script = document.createElement('script');
        script.setAttribute('data-naver-maps', 'true');
        script.async = true;
        script.defer = true;

        // ✅ 문서에서 바뀐 방식: ncpKeyId
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(ncpKeyId)}`;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Naver Maps script'));

        document.head.appendChild(script);
      });

    const init = async () => {
      try {
        await ensureScript();

        if (!mapRef.current) return;
        const naver = window.naver;
        if (!naver?.maps) return;

        const center = new naver.maps.LatLng(companyLat, companyLng);

        // 지도 인스턴스(한 번만 생성)
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new naver.maps.Map(mapRef.current, {
            center,
            zoom: 16,
            zoomControl: true,
            zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
          });
        } else {
          mapInstanceRef.current.setCenter(center);
        }

        const map = mapInstanceRef.current;

        // ✅ 회사 마커 (작은 핀/아이콘 스타일)
        // 이미 있으면 교체하지 않고 위치만 갱신
        if (!companyMarkerRef.current) {
          companyMarkerRef.current = new naver.maps.Marker({
            position: center,
            map,
            icon: {
              url: companyIconUrl,
              size: new naver.maps.Size(28, 28),
              scaledSize: new naver.maps.Size(28, 28),
              // 아이콘의 "아래쪽 중앙"이 좌표를 찍도록
              anchor: new naver.maps.Point(14, 28),
            },
            // 클릭되면 살짝 떠오르는 느낌(기본)
            clickable: true,
          });
        } else {
          companyMarkerRef.current.setPosition(center);
          companyMarkerRef.current.setMap(map);
        }
      } catch (e) {
        // 실패해도 화면은 유지
        console.error(e);
      }
    };

    init();
  }, [ncpKeyId, companyLat, companyLng, companyIconUrl]);

  return (
    <div className="map-view">
      <div className="map-view__overlay">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <span>{markerCount}개 마커 표시 중</span>
        {selectedName && <span className="map-view__selected">선택됨: {selectedName}</span>}
      </div>

      {/* ✅ 여기가 실제 지도 영역 */}
      <div
        ref={mapRef}
        className="map-view__map"
        style={{
          width: '100%',
          height: 520,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
