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

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const SNAP_POINTS = useMemo(() => {
    return {
      collapsed: 180,
      detail: Math.round(vh * 0.62),
      expanded: Math.round(vh * 0.85),
    } as const;
  }, [vh]);

  const height = SNAP_POINTS[mode];

  const buttonLabel = mode === 'collapsed' ? '목록 보기' : '지도 보기';

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
      <div className="bottom-sheet__top">
        <button type="button" onClick={handleToggle} className="sheet-toggle-button">
          {buttonLabel}
        </button>
      </div>

      <div className="bottom-sheet__content">{children}</div>
    </div>
  );
}
