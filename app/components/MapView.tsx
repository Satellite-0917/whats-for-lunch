'use client';

import { useEffect, useMemo, useRef } from 'react';

declare global {
  interface Window {
    naver?: any;
  }
}

/** ✅ 등록된 장소(마커) 데이터 타입
 *  lat/lng는 숫자 or 문자열 둘 다 허용 (DB/JSON에서 문자열로 오는 경우 대응)
 */
export type Place = {
  id: string;
  name: string;
  category: string; // "한식" "일식" ...
  lat: number | string;
  lng: number | string;
};

type MapViewProps = {
  title: string;
  subtitle: string;
  selectedName?: string;

  /** 기존 UI 표시용(있으면 쓰고 없으면 그냥 0으로) */
  markerCount: number;

  /** ✅ 추가 기능(옵션): 등록된 장소들 */
  places?: Place[];

  /** ✅ 추가 기능(옵션): 선택된 카테고리들 */
  selectedCategories?: string[];
};

export default function MapView({
  title,
  subtitle,
  selectedName,
  markerCount,
  places = [],
  selectedCategories = [],
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const companyMarkerRef = useRef<any>(null);
  const placeMarkersRef = useRef<Record<string, any>>({});
  const iconCacheRef = useRef<Record<string, string>>({}); // color -> dataUrl

  const ncpKeyId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const companyLat = Number(process.env.NEXT_PUBLIC_COMPANY_LAT ?? '37.507520');
  const companyLng = Number(process.env.NEXT_PUBLIC_COMPANY_LNG ?? '127.055055');

  /** ✅ 카테고리별 색상표 */
  const CATEGORY_COLOR: Record<string, string> = useMemo(
    () => ({
      한식: '#D32F2F',
      중식: '#FF8F00',
      일식: '#4CAF50',
      양식: '#FF7043',
      베트남: '#2ECC71',
      분식: '#E91E63',
      샐러드: '#8BC34A',
      패스트푸드: '#FFC107',
      편의점: '#2196F3',
      카페: '#6D4C41',
      베이커리: '#F5DEB3',
    }),
    []
  );

  /** ✅ 작은 회사(빌딩) 아이콘 SVG (기존 유지) */
  const companyIconUrl = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <defs>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.25"/>
          </filter>
        </defs>
        <circle cx="14" cy="14" r="12" fill="white" filter="url(#s)"/>
        <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(0,0,0,0.12)"/>
        <g transform="translate(8,6)">
          <rect x="0" y="4" width="12" height="14" rx="2" fill="#2D7FF9"/>
          <rect x="3" y="0" width="6" height="18" rx="2" fill="#1F5FCC"/>
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

  /** ✅ 카테고리 색 핀 SVG 만들기 (파일 없음) */
  const makePinSvgDataUrl = (color: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C9.4 0 4 5.4 4 12c0 9.2 12 28 12 28s12-18.8 12-28C28 5.4 22.6 0 16 0z"
              fill="${color}" />
        <circle cx="16" cy="12" r="5" fill="white" fill-opacity="0.95"/>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  /** ✅ 카테고리 -> 아이콘 URL (색상별 캐시) */
  const getIconUrlByCategory = (category: string) => {
    const color = CATEGORY_COLOR[category] ?? '#666666';
    if (!iconCacheRef.current[color]) {
      iconCacheRef.current[color] = makePinSvgDataUrl(color);
    }
    return iconCacheRef.current[color];
  };

  /** ✅ 필터 적용: 선택 없으면 전체 표시 */
  const isVisibleByFilter = (category: string) => {
    if (!selectedCategories || selectedCategories.length === 0) return true;
    return selectedCategories.includes(category);
  };

  useEffect(() => {
    if (!ncpKeyId) return;

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.naver?.maps) return resolve();

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

        // ✅ 지도 생성(한 번만)
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

        // ✅ 회사 마커
        if (!companyMarkerRef.current) {
          companyMarkerRef.current = new naver.maps.Marker({
            position: center,
            map,
            icon: {
              url: companyIconUrl,
              size: new naver.maps.Size(28, 28),
              scaledSize: new naver.maps.Size(28, 28),
              anchor: new naver.maps.Point(14, 28),
            },
            clickable: true,
          });
        } else {
          companyMarkerRef.current.setPosition(center);
          companyMarkerRef.current.setMap(map);
        }

        // ✅ 장소 마커 생성/갱신 (핵심: lat/lng를 Number로 변환)
        for (const p of places) {
          if (!p?.id) continue;

          const lat = Number(p.lat);
          const lng = Number(p.lng);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.warn('좌표 이상(스킵):', p);
            continue;
          }

          const position = new naver.maps.LatLng(lat, lng);

          if (placeMarkersRef.current[p.id]) {
            placeMarkersRef.current[p.id].setPosition(position);
          } else {
            const iconUrl = getIconUrlByCategory(p.category);

            placeMarkersRef.current[p.id] = new naver.maps.Marker({
              position,
              map,
              title: p.name,
              icon: {
                url: iconUrl,
                size: new naver.maps.Size(32, 40),
                scaledSize: new naver.maps.Size(32, 40),
                anchor: new naver.maps.Point(16, 40),
              },
              clickable: true,
            });
          }
        }

        // ✅ 필터 반영(show/hide)
        for (const p of places) {
          const marker = placeMarkersRef.current[p.id];
          if (!marker) continue;
          marker.setMap(isVisibleByFilter(p.category) ? map : null);
        }

        // ✅ places에서 제거된 항목은 마커도 제거(동기화)
        const keep = new Set(places.map((p) => p.id));
        for (const [id, marker] of Object.entries(placeMarkersRef.current)) {
          if (!keep.has(id)) {
            marker.setMap(null);
            delete placeMarkersRef.current[id];
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    init();
  }, [ncpKeyId, companyLat, companyLng, companyIconUrl, places, selectedCategories, CATEGORY_COLOR]);

  return (
    <div className="map-view">
      <div className="map-view__overlay">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <span>{markerCount}개 마커 표시 중</span>
        {selectedName && <span className="map-view__selected">선택됨: {selectedName}</span>}
      </div>

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
