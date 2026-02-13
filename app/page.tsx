'use client';

import { useEffect, useMemo, useState } from 'react';
import BottomSheet from './components/BottomSheet';
import CommentSection from './components/CommentSection';
import MapView from './components/MapView';

type Place = {
  place_id: string;
  name: string;
  group: string;
  category: string;
  lat: number;
  lng: number;
  map_url: string;
  status: string;
  updated_at: string | null;
};

type PlaceWithDistance = Place & { distance: number };

type DataResponse = {
  places: Place[];
  categoryColors: Record<string, string>;
};

const COMPANY_LAT = Number(process.env.NEXT_PUBLIC_COMPANY_LAT ?? '37.507520');
const COMPANY_LNG = Number(process.env.NEXT_PUBLIC_COMPANY_LNG ?? '127.055055');

const RADIUS_OPTIONS = [200, 400, 600, 800, 1000];
const DEFAULT_RADIUS = 600;
const DEFAULT_COLOR = '#9CA3AF';
const NEW_DAYS = 7;
const WALK_SPEED_M_PER_MIN = 80;

const TABS = [
  { key: 'map', label: '지도' },
  { key: 'random', label: '랜덤 추천' },
  { key: 'settings', label: '설정' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
type SheetMode = 'collapsed' | 'expanded' | 'detail';

function toMeters(distanceKm: number) {
  return Math.round(distanceKm * 1000);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return toMeters(earthRadiusKm * c);
}

function isNew(updatedAt: string | null) {
  if (!updatedAt) return false;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  const diff = Date.now() - parsed.getTime();
  return diff <= NEW_DAYS * 24 * 60 * 60 * 1000;
}

function formatWalkMinutes(distanceMeters: number) {
  return Math.max(1, Math.round(distanceMeters / WALK_SPEED_M_PER_MIN));
}

function isActiveStatus(status: string) {
  const s = (status ?? '').trim();
  if (!s) return true;
  return s === '제휴중' || s === '제휴 중' || s === '활성' || s === 'active';
}

/**
 * ✅ 회사 -> 가게 “도보 길찾기” URL 생성
 * - 도착지가 비는 문제 방지: 이름/좌표를 확실히 넣고 encodeURIComponent 처리
 * - (네이버가 내부적으로 포맷을 바꿀 수는 있지만) 현재 웹에서 가장 흔히 쓰는 p/directions 포맷
 */
function makeWalkDirectionsUrl(place: { name: string; lat: number; lng: number }) {
  const sName = encodeURIComponent('회사');
  const eName = encodeURIComponent(place.name);

  const slng = COMPANY_LNG;
  const slat = COMPANY_LAT;
  const elng = place.lng;
  const elat = place.lat;

  // ✅ 핵심: lng,lat 순서
  return `https://map.naver.com/p/directions/${slng},${slat},${sName},place/${elng},${elat},${eName},place/-/walk`;
}

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithDistance | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');

  const [tab, setTab] = useState<TabKey>('map');
  const [randomPick, setRandomPick] = useState<PlaceWithDistance | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const clearSelection = () => {
    setSelectedPlace(null);
    setSheetMode('collapsed');
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setStatus('loading');
        const response = await fetch('/api/places');
        const data = (await response.json()) as DataResponse & { message?: string };
        if (!response.ok) throw new Error(data.message ?? '데이터를 불러오지 못했습니다.');
        if (!isMounted) return;
        setPlaces(data.places);
        setCategoryColors(data.categoryColors);
        setStatus('idle');
      } catch (error) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((place) => {
      if (place.category) set.add(place.category);
    });
    return Array.from(set).sort();
  }, [places]);

  const placesWithDistance = useMemo(() => {
    return places
      .filter((place) => isActiveStatus(place.status))
      .map((place) => ({
        ...place,
        distance: haversineMeters(COMPANY_LAT, COMPANY_LNG, place.lat, place.lng),
      }));
  }, [places]);

  const filteredPlaces = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const categoryFilterActive = selectedCategories.size > 0;

    return placesWithDistance
      .filter((place) => place.distance <= radius)
      .filter((place) => {
        if (!keyword) return true;
        return place.name.toLowerCase().includes(keyword);
      })
      .filter((place) => {
        if (!categoryFilterActive) return true;
        return selectedCategories.has(place.category);
      })
      .sort((a, b) => a.distance - b.distance);
  }, [placesWithDistance, radius, searchTerm, selectedCategories]);

  const topPlaces = filteredPlaces.slice(0, 20);
  const miniPlaces = filteredPlaces.slice(0, 3);

  useEffect(() => {
    if (selectedPlace && !filteredPlaces.find((p) => p.place_id === selectedPlace.place_id)) {
      clearSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPlaces, selectedPlace]);

  useEffect(() => {
    setRandomPick(null);
  }, [radius, selectedCategories, searchTerm, placesWithDistance]);

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSelectPlace = (place: PlaceWithDistance) => {
    setSelectedPlace(place);
    setSheetMode('detail');
  };

  const handleBackToList = () => {
    setSelectedPlace(null);
    setSheetMode('expanded');
  };

  const handleRandomPick = () => {
    if (!filteredPlaces.length) {
      setRandomPick(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredPlaces.length);
    setRandomPick(filteredPlaces[randomIndex]);
  };

  const getCategoryColor = (category: string) => categoryColors[category] ?? DEFAULT_COLOR;

  const summaryTitle = selectedPlace ? selectedPlace.name : '근처 목록';
  const summarySubtitle = selectedPlace
    ? `${selectedPlace.category} · 도보 ${formatWalkMinutes(selectedPlace.distance)}분`
    : `${filteredPlaces.length}곳 · 반경 ${radius}m`;

  const mapSubtitle = `회사 기준 반경 ${radius}m · ${filteredPlaces.length}곳`;

  const mapPlaces = useMemo(
    () =>
      filteredPlaces.map((p) => ({
        id: p.place_id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
      })),
    [filteredPlaces]
  );

  const handleSelectPlaceIdFromMap = (placeId: string) => {
    const found = filteredPlaces.find((p) => p.place_id === placeId);
    if (!found) return;
    handleSelectPlace(found);
  };

  return (
    <div className="app-shell">
      {tab !== 'settings' && (
        <div className="top-bar">
          <div className="search-row">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="가게 이름을 검색하세요"
            />
          </div>

          <div className="chip-row">
            {categories.map((category) => {
              const isSelected = selectedCategories.has(category);
              const color = getCategoryColor(category);
              return (
                <button
                  key={category}
                  type="button"
                  className={`chip ${isSelected ? 'selected' : ''}`}
                  style={isSelected ? { backgroundColor: color } : { borderColor: color, color: color }}
                  onClick={() => handleToggleCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'map' && (
        <>
          <MapView
            title="오늘 뭐 먹지?"
            subtitle={mapSubtitle}
            selectedName={selectedPlace?.name}
            markerCount={filteredPlaces.length}
            places={mapPlaces}
            selectedCategories={Array.from(selectedCategories)}
            selectedPlaceId={selectedPlace?.place_id ?? null}
            onSelectPlaceId={handleSelectPlaceIdFromMap}
            onClearSelection={clearSelection}
          />

          <BottomSheet mode={sheetMode} onModeChange={setSheetMode}>
            {status === 'loading' && <div className="state-box">데이터를 불러오는 중입니다...</div>}
            {status === 'error' && <div className="state-box">{errorMessage}</div>}
            {status === 'idle' && filteredPlaces.length === 0 && (
              <div className="state-box">조건에 맞는 장소가 없습니다. 반경이나 필터를 조정해 보세요.</div>
            )}

            {status === 'idle' && filteredPlaces.length > 0 && (
              <div className="summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{summaryTitle}</strong>
                    <p style={{ margin: '4px 0', color: 'var(--muted)', fontSize: 13 }}>{summarySubtitle}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {!selectedPlace && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setSheetMode((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))}
                      >
                        {sheetMode === 'expanded' ? '접기' : '전체보기'}
                      </button>
                    )}

                    {selectedPlace && (
                      <>
                        <button type="button" className="link-button" onClick={handleBackToList}>
                          목록
                        </button>

                        {/* ✅ 도보 길찾기 복구 */}
                        <a
                          className="link-button"
                          href={makeWalkDirectionsUrl(selectedPlace)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          도보 길찾기
                        </a>

                        <a className="link-button" href={selectedPlace.map_url} target="_blank" rel="noopener noreferrer">
                          지도 열기
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {selectedPlace && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <span className="badge" style={{ background: getCategoryColor(selectedPlace.category) }}>
                        {selectedPlace.category}
                      </span>
                      {isNew(selectedPlace.updated_at) && <span className="new-badge">NEW</span>}
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        도보 약 {formatWalkMinutes(selectedPlace.distance)}분
                      </span>
                    </div>

                    <CommentSection placeId={selectedPlace.place_id} adminMode={adminMode} adminPassword={adminPassword} />
                  </>
                )}

                {!selectedPlace && sheetMode === 'collapsed' && (
                  <div style={{ marginTop: 12 }}>
                    <h2 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--muted)' }}>가까운 곳 미리보기</h2>
                    <div className="list">
                      {miniPlaces.map((place) => (
                        <div key={place.place_id} className="list-item" onClick={() => handleSelectPlace(place)}>
                          <div className="meta">
                            <strong>{place.name}</strong>
                            <span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: getCategoryColor(place.category),
                                  marginRight: 6,
                                }}
                              />
                              {place.category}
                              {isNew(place.updated_at) && (
                                <span className="new-badge" style={{ marginLeft: 6 }}>
                                  NEW
                                </span>
                              )}
                              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                                {formatWalkMinutes(place.distance)}분
                              </span>
                            </span>
                          </div>

                          <a
                            className="link-button"
                            href={place.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            지도
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedPlace && sheetMode === 'expanded' && (
                  <div style={{ marginTop: 16 }}>
                    <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>가까운 곳 TOP 20</h2>
                    <div className="list">
                      {topPlaces.map((place) => (
                        <div key={place.place_id} className="list-item" onClick={() => handleSelectPlace(place)}>
                          <div className="meta">
                            <strong>{place.name}</strong>
                            <span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: getCategoryColor(place.category),
                                  marginRight: 6,
                                }}
                              />
                              {place.category}
                              {isNew(place.updated_at) && (
                                <span className="new-badge" style={{ marginLeft: 6 }}>
                                  NEW
                                </span>
                              )}
                              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                                {formatWalkMinutes(place.distance)}분
                              </span>
                            </span>
                          </div>

                          <a
                            className="link-button"
                            href={place.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            지도
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </BottomSheet>
        </>
      )}

      {tab === 'random' && (
        <main>
          <h1>랜덤 추천</h1>
          <section>
            <button className="primary-button" type="button" onClick={handleRandomPick}>
              랜덤 추천 받기
            </button>
          </section>

          {status === 'loading' && <div className="state-box">데이터를 불러오는 중입니다...</div>}
          {status === 'error' && <div className="state-box">{errorMessage}</div>}
          {status === 'idle' && filteredPlaces.length === 0 && (
            <div className="state-box">조건에 맞는 장소가 없습니다. 필터를 조정해 보세요.</div>
          )}

          {randomPick && (
            <section>
              <div className="summary-card">
                <strong style={{ fontSize: 18 }}>{randomPick.name}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ background: getCategoryColor(randomPick.category) }}>
                    {randomPick.category}
                  </span>
                  {isNew(randomPick.updated_at) && <span className="new-badge">NEW</span>}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    도보 약 {formatWalkMinutes(randomPick.distance)}분
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <a className="link-button" href={randomPick.map_url} target="_blank" rel="noopener noreferrer">
                    지도 열기
                  </a>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => {
                      setSelectedPlace(randomPick);
                      setSheetMode('detail');
                      setTab('map');
                    }}
                  >
                    지도에서 보기
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {tab === 'settings' && (
        <main>
          <h1>설정</h1>
          <div className="settings-panel">
            <div className="toggle-row">
              <span>다크 모드</span>
              <button type="button" className="link-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? '라이트' : '다크'}
              </button>
            </div>

            <div>
              <strong>활동 범위</strong>
              <div className="segmented" style={{ marginTop: 12 }}>
                {RADIUS_OPTIONS.map((option) => (
                  <button key={option} type="button" className={option === radius ? 'active' : ''} onClick={() => setRadius(option)}>
                    {option}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <strong>관리자 모드</strong>
              <div className="toggle-row" style={{ marginTop: 12 }}>
                <input
                  type="password"
                  placeholder="ADMIN_PASSWORD 입력"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                />
                <button type="button" className="link-button" onClick={() => setAdminMode((prev) => !prev)}>
                  {adminMode ? '관리자 끄기' : '관리자 켜기'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>관리자 모드에서 댓글 삭제 버튼이 표시됩니다.</p>
            </div>

            <div className="state-box">지도 스타일/도보 경로는 네이버 지도 SDK + Directions API 키를 연결하면 활성화됩니다.</div>
          </div>
        </main>
      )}

      <nav className="bottom-nav">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? 'active' : ''}
            onClick={() => {
              clearSelection();
              setTab(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
