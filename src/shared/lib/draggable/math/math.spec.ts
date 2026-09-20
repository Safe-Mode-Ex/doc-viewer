import { clampPercent, percentToPixels, toPercent } from '../math';

describe('clampPercent', () => {
  it('should keep value inside range', () => {
    expect(clampPercent(40, 20)).toBe(40);
  });

  it('should clamp to the upper bound', () => {
    expect(clampPercent(90, 20)).toBe(80);
  });

  it('should clamp to zero', () => {
    expect(clampPercent(-10, 20)).toBe(0);
  });
});

describe('toPercent', () => {
  it('should convert pixels to percent', () => {
    expect(toPercent(50, 200)).toBe(25);
  });

  it('should not divide by zero when size is one', () => {
    expect(toPercent(50, 1)).toBe(5000);
  });
});

describe('percentToPixels', () => {
  it('should convert percent to pixels', () => {
    expect(percentToPixels(25, 200)).toBe(50);
  });
});
