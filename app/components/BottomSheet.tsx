'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type BottomSheetProps = {
  mode: 'collapsed' | 'expanded' | 'detail';
  onModeChange: (mode: 'collapsed' | 'expanded' | 'detail') => void;
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

    if (delta < -60) {
      onModeChange('expanded');
    } else if (delta > 60) {
      onModeChange('collapsed');
    }
  };

  const handleToggle = () => {
    if (mode === 'expanded') onModeChange('collapsed');
    else onModeChange('expanded');
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
