import { describe, it, expect } from 'vitest';
import { computeViewport } from './useViewport';

describe('computeViewport', () => {
  it('điện thoại dọc: hẹp + portrait', () => {
    const vp = computeViewport(390, true);
    expect(vp.isMobile).toBe(true);
    expect(vp.isPortrait).toBe(true);
    expect(vp.isLandscape).toBe(false);
    expect(vp.width).toBe(390);
  });

  it('ngưỡng 768 là desktop (không mobile)', () => {
    expect(computeViewport(768, false).isMobile).toBe(false);
  });

  it('767 là mobile', () => {
    expect(computeViewport(767, false).isMobile).toBe(true);
  });

  it('landscape là nghịch đảo của portrait', () => {
    expect(computeViewport(900, false).isLandscape).toBe(true);
    expect(computeViewport(900, true).isLandscape).toBe(false);
  });
});
