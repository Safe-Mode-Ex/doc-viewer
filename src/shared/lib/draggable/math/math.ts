export function clampPercent(value: number, elementSizePercent: number): number {
  return Math.max(0, Math.min(100 - elementSizePercent, value));
}

export function toPercent(pixels: number, size: number): number {
  return (pixels / size) * 100;
}

export function percentToPixels(percent: number, size: number): number {
  return (percent / 100) * size;
}