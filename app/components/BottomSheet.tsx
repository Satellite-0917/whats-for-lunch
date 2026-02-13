'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type BottomSheetMode = 'collapsed' | 'expanded' | 'detail';

type BottomSheetProps = {
  mode: BottomSheetMode;
  onModeChange: (mode: BottomSheetMode) => void;
  children: React.ReactNode;
};

export default function BottomSheet({ mode, onModeChange, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [vh, setVh] = useState(800);
  const startY = useRef<number | null>(null);

  // 화면 높이 추적 (기기/브라우저마다 다르게 보이는 문제 방지)
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setDragOffset(0);
  }, [mode]);

  // ✅ 화면 비율 기반 스냅 포인트
  const SNAP_POINTS = useMemo(() => {
    return {
      collapsed: 180,
      detail: Math.round(vh * 0.62),
      expanded: Math.round(vh * 0.85),
    } as const;
  }, [vh]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    setDragOffset(delta);
  };

  const handlePointerUp = () => {
    if (startY.current === null) return;
    const delta = dragOffset;
    startY.current = null;
    setDragOffset(0);

    // ✅ 드래그 동작을 mode별로 자연스럽게
    // 위로 드래그(음수) = 더 펼치기
    if (delta < -60) {
      if (mode === 'collapsed') onModeChange('detail');
      else onModeChange('expanded');
      return;
    }

    // 아래로 드래그(양수) = 더 접기
    if (delta > 60) {
      if (mode === 'expanded') onModeChange('detail');
      else onModeChange('collapsed');
      return;
    }
  };

  const handleToggle = () => {
    // ✅ 클릭 토글도 detail 고려
    if (mode === 'collapsed') onModeChange('detail');
    else if (mode === 'detail') onModeChange('expanded');
    else onModeChange('collapsed');
  };

  const height = SNAP_POINTS[mode];

  return (
    <div
      className="bottom-sheet"
      style={{
        height,
        maxHeight: Math.round(vh * 0.9),
        transform: `translateY(${dragOffset}px)`,
      }}
    >
      <div
        className="bottom-sheet__handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleToggle}
      >
        <span />
      </div>

      <div className="bottom-sheet__content">{children}</div>
    </div>
  );
}
