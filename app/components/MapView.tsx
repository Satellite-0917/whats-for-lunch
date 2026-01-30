'use client';

type MapViewProps = {
  title: string;
  subtitle: string;
  selectedName?: string;
  markerCount: number;
};

export default function MapView({ title, subtitle, selectedName, markerCount }: MapViewProps) {
  return (
    <div className="map-view">
      <div className="map-view__overlay">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <span>{markerCount}개 마커 표시 중</span>
        {selectedName && <span className="map-view__selected">선택됨: {selectedName}</span>}
      </div>
      <div className="map-view__placeholder">
        <p>네이버 지도 SDK 연동 영역</p>
        <p className="map-view__hint">지금은 UI 흐름 데모를 위해 플레이스홀더로 표시됩니다.</p>
      </div>
    </div>
  );
}
