import { toPercent } from '../math';
import { DragMetrics } from '../types';

export function measureElement(el: HTMLElement): DragMetrics {
  const parent = el.parentElement;
  const parentRect = parent?.getBoundingClientRect();
  const parentWidth = parentRect?.width ?? 1;
  const parentHeight = parentRect?.height ?? 1;

  const currentRect = el.getBoundingClientRect();
  const leftPercent = parentRect ? toPercent(currentRect.left - parentRect.left, parentWidth) : 0;
  const topPercent = parentRect ? toPercent(currentRect.top - parentRect.top, parentHeight) : 0;

  return {
    parentWidth,
    parentHeight,
    leftPercent,
    topPercent,
    elementWidthPercent: toPercent(el.offsetWidth, parentWidth),
    elementHeightPercent: toPercent(el.offsetHeight, parentHeight),
  };
}
