import { useState, useEffect } from 'react';

export interface Viewport {
  width: number;
  isMobile: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

/** Hàm thuần (test được ở môi trường node): suy ra cờ viewport từ width + orientation. */
export function computeViewport(width: number, portrait: boolean): Viewport {
  const isMobile = width < 768;
  return { width, isMobile, isPortrait: portrait, isLandscape: !portrait };
}

function readViewport(): Viewport {
  if (typeof window === 'undefined') {
    // Mặc định desktop khi không có window (an toàn cho test/SSR).
    return computeViewport(1280, false);
  }
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return computeViewport(window.innerWidth, portrait);
}

/** Hook React: theo dõi thay đổi kích thước & hướng màn hình. */
export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(readViewport);

  useEffect(() => {
    const onChange = () => setVp(readViewport());
    const mqMobile = window.matchMedia('(max-width: 767px)');
    const mqPortrait = window.matchMedia('(orientation: portrait)');
    mqMobile.addEventListener('change', onChange);
    mqPortrait.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    // Đồng bộ 1 lần phòng khi giá trị đổi giữa render đầu và mount.
    onChange();
    return () => {
      mqMobile.removeEventListener('change', onChange);
      mqPortrait.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return vp;
}
