'use client';

import { useEffect, useMemo, useRef } from 'react';

declare global {
  interface Window {
    naver?: any;
  }
}

export type Place = {
  id: string;
  name: string;
  category: string;
  lat: number | string;
  lng: number | string;
};

type MapViewProps = {
  title: string;
  subtitle: string;
  selectedName?: string;
  markerCount: number;

  places?: Place[];
  selectedCategories?: string[];

  // ✅ 마커 선택/강조
  selectedPlaceId?: string | null;
  onSelectPlaceId?: (placeId: string) => void;

  // ✅ 지도 배경 클릭 시 선택 해제
  onClearSelection?: () => void;
};

export default function MapView({
  title,
  subtitle,
  selectedName,
  markerCount,
  places = [],
  selectedCategories = [],
  selectedPlaceId = null,
  onSelectPlaceId,
  onClearSelection,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const companyMarkerRef = useRef<any>(null);
  const placeMarkersRef = useRef<Record<string, any>>({});
  const iconCacheRef = useRef<Record<string, string>>({}); // color -> dataUrl
  const mapClickBoundRef = useRef(false); // ✅ 지도 클릭 리스너 중복 방지

  const ncpKeyId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const companyLat = Number(process.env.NEXT_PUBLIC_COMPANY_LAT ?? '37.507520');
  const companyLng = Number(process.env.NEXT_PUBLIC_COMPANY_LNG ?? '127.055055');

  // ✅ 디버그 로그 ON/OFF
  const DEBUG = true;
  const dlog = (...args: any[]) => {
    if (DEBUG) console.log('[MapView]', ...args);
  };

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

  /** ✅ 회사(빌딩) 아이콘 */
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

  /** ✅ 카테고리 핀 SVG */
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

  /** ✅ 선택된 마커(식당) 강조용 아이콘 */
  const makeSelectedPinSvgDataUrl = (color: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <path d="M18 0C10.8 0 5 5.8 5 13c0 10 13 31 13 31s13-21 13-31C31 5.8 25.2 0 18 0z"
              fill="${color}" />
        <circle cx="18" cy="13" r="5.5" fill="white" fill-opacity="0.95"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const normalizeCategory = (v: string) => (v ?? '').trim();

  const getColorByCategory = (category: string) => {
    const cat = normalizeCategory(category);
    return CATEGORY_COLOR[cat] ?? '#666666';
  };

  const getIconUrlByCategory = (category: string) => {
    const color = getColorByCategory(category);
    if (!iconCacheRef.current[color]) {
      iconCacheRef.current[color] = makePinSvgDataUrl(color);
    }
    return iconCacheRef.current[color];
  };

  const getSelectedIconUrlByCategory = (category: string) => {
    const color = getColorByCategory(category);
    const key = `${color}__selected`;
    if (!iconCacheRef.current[key]) {
      iconCacheRef.current[key] = makeSelectedPinSvgDataUrl(color);
    }
    return iconCacheRef.current[key];
  };

  const isVisibleByFilter = (category: string) => {
    const cat = normalizeCategory(category);
    const selected = (selectedCategories ?? []).map(normalizeCategory).filter(Boolean);
    if (selected.length === 0) return true;
    return selected.includes(cat);
  };

  useEffect(() => {
    dlog('places length:', places?.length, 'sample:', places?.[0]);
    dlog('selectedCategories:', selectedCategories);
    dlog('selectedPlaceId:', selectedPlaceId);
  }, [places, selectedCategories, selectedPlaceId]);

  useEffect(() => {
    if (!ncpKeyId) {
      console.error('[MapView] NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is missing');
      return;
    }

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
          dlog('map created');
        } else {
          mapInstanceRef.current.setCenter(center);
        }

        const map = mapInstanceRef.current;

        // ✅ 지도 배경 클릭 → 선택 해제
        if (!mapClickBoundRef.current) {
          mapClickBoundRef.current = true;
          naver.maps.Event.addListener(map, 'click', () => {
            onClearSelection?.();
          });
        }

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
          dlog('company marker created');
        } else {
          companyMarkerRef.current.setPosition(center);
          companyMarkerRef.current.setMap(map);
        }

        // ✅ places 마커 생성/갱신
        for (const p of places) {
          if (!p?.id) continue;

          const lat = Number(p.lat);
          const lng = Number(p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const position = new naver.maps.LatLng(lat, lng);

          if (placeMarkersRef.current[p.id]) {
            placeMarkersRef.current[p.id].setPosition(position);
          } else {
            const iconUrl = getIconUrlByCategory(p.category);

            const marker = new naver.maps.Marker({
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

            // ✅ 마커 클릭 → 선택
            naver.maps.Event.addListener(marker, 'click', () => {
              onSelectPlaceId?.(p.id);
              map.panTo(position);
            });

            placeMarkersRef.current[p.id] = marker;
          }
        }

        // ✅ 필터 show/hide
        for (const p of places) {
          const marker = placeMarkersRef.current[p.id];
          if (!marker) continue;
          const visible = isVisibleByFilter(p.category);
          marker.setMap(visible ? map : null);
        }

        // ✅ places에서 사라진 마커 제거
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
  }, [ncpKeyId, companyLat, companyLng, companyIconUrl, places, selectedCategories, CATEGORY_COLOR, onSelectPlaceId, onClearSelection]);

  // ✅ 선택된 마커 아이콘만 “크게” 바꿔주기
  useEffect(() => {
    const naver = window.naver;
    if (!naver?.maps) return;

    for (const p of places) {
      const marker = placeMarkersRef.current[p.id];
      if (!marker) continue;

      const isSelected = selectedPlaceId && p.id === selectedPlaceId;
      const iconUrl = isSelected ? getSelectedIconUrlByCategory(p.category) : getIconUrlByCategory(p.category);

      marker.setIcon({
        url: iconUrl,
        size: new naver.maps.Size(isSelected ? 36 : 32, isSelected ? 44 : 40),
        scaledSize: new naver.maps.Size(isSelected ? 36 : 32, isSelected ? 44 : 40),
        anchor: new naver.maps.Point(isSelected ? 18 : 16, isSelected ? 44 : 40),
      });
    }
  }, [places, selectedPlaceId]);

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
