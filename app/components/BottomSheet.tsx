'use client';

import { useEffect, useRef, useState } from 'react';

type BottomSheetProps = {
  mode: 'collapsed' | 'expanded' | 'detail';
  onModeChange: (mode: 'collapsed' | 'expanded' | 'detail') => void;
  children: React.ReactNode;
};

const SNAP_POINTS = {
  collapsed: 160,
  expanded: 520,
  detail: 320,
};

export default function BottomSheet({ mode, onModeChange, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    setDragOffset(0);
  }, [mode]);

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
    if (mode === 'expanded') {
      onModeChange('collapsed');
    } else if (mode === 'collapsed') {
      onModeChange('expanded');
    }
  };

  const height = SNAP_POINTS[mode];

  return (
    <div
      className="bottom-sheet"
      style={{ height, transform: `translateY(${dragOffset}px)` }}
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
