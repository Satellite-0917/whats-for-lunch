'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type BottomSheetProps = {
  mode: 'collapsed' | 'expanded' | 'detail';
  onModeChange: (mode: 'collapsed' | 'expanded' | 'detail') => void;
  children: React.ReactNode;
};

export default function BottomSheet({ mode, onModeChange, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [vh, setVh] = useState<number>(800); // 초기값 아무거나
  const startY = useRef<number | null>(null);

  // ✅ 화면 높이(뷰포트) 가져오기
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setDragOffset(0);
  }, [mode]);

  // ✅ 스냅 높이를 "화면 비율"로 계산
  const SNAP_POINTS = useMemo(() => {
    return {
      collapsed: 180, // 요약/미리보기
      detail: Math.round(vh * 0.62), // 댓글 달기 충분
      expanded: Math.round(vh * 0.85), // 목록 보기용(최대)
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

    if (delta < -60) onModeChange('expanded');
    else if (delta > 60) onModeChange('collapsed');
  };

  const handleToggle = () => {
    onModeChange(mode === 'expanded' ? 'collapsed' : 'expanded');
  };

  const height = SNAP_POINTS[mode];

  return (
    <div
      className="bottom-sheet"
      style={{
        height,
        maxHeight: Math.round(vh * 0.9), // ✅ 혹시 모를 제한 방지
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
