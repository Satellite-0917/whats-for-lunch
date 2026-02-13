'use client';

import { useEffect, useMemo, useState } from 'react';

type BottomSheetMode = 'collapsed' | 'expanded' | 'detail';

type BottomSheetProps = {
  mode: BottomSheetMode;
  onModeChange: (mode: BottomSheetMode) => void;
  children: React.ReactNode;
};

export default function BottomSheet({ mode, onModeChange, children }: BottomSheetProps) {
  const [vh, setVh] = useState(800);

  // 화면 높이 추적 (기기/브라우저마다 다르게 보이는 문제 방지)
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ✅ 화면 비율 기반 스냅 포인트 (기존 로직 유지)
  const SNAP_POINTS = useMemo(() => {
    return {
      collapsed: 180,
      detail: Math.round(vh * 0.62),
      expanded: Math.round(vh * 0.85),
    } as const;
  }, [vh]);

  const height = SNAP_POINTS[mode];

  // ✅ 버튼 라벨: collapsed면 "목록 보기", 그 외는 "지도 보기"
  const buttonLabel = mode === 'collapsed' ? '목록 보기' : '지도 보기';

  // ✅ 토글 동작:
  // - collapsed -> expanded (목록 펼치기)
  // - expanded/detail -> collapsed (지도 보기)
  const handleToggle = () => {
    if (mode === 'collapsed') onModeChange('expanded');
    else onModeChange('collapsed');
  };

  return (
    <div
      className="bottom-sheet"
      style={{
        height,
        maxHeight: Math.round(vh * 0.9),
      }}
    >
      {/* ✅ 핸들 대신 토글 버튼 */}
      <div style={{ padding: '10px 12px 0', marginBottom: 16 }}>
        <button
          type="button"
          onClick={handleToggle}
          className="primary-button"
          style={{
            width: '100%',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 14,

            // ✅ 조화형(튀지 않는) 버튼 톤: 라이트/다크 모두 자연스럽게
            background: 'color-mix(in srgb, var(--accent) 85%, transparent)',
            color: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--card) 18%, transparent)',

            // primary-button의 강한 스타일을 확실히 덮기 위한 안전장치
            boxShadow: 'none',
          }}
        >
          {buttonLabel}
        </button>
      </div>

      <div className="bottom-sheet__content">{children}</div>
    </div>
  );
}
