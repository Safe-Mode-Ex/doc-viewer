import { DRAG_THRESHOLD_PX } from '../const';
import { clampPercent, percentToPixels, toPercent } from '../math';
import { measureElement } from '../measure/measure';
import { DragMetrics, DragPosition } from '../types';

export class DragGesture {
  private readonly startX: number;
  private readonly startY: number;
  private readonly pointerId: number;
  private readonly metrics: DragMetrics;
  private readonly onStart?: () => void;

  private dragStarted = false;
  private finalXPercent: number;
  private finalYPercent: number;
  private captureEl?: Element;

  private constructor(
    startX: number,
    startY: number,
    pointerId: number,
    metrics: DragMetrics,
    onStart?: () => void,
  ) {
    this.startX = startX;
    this.startY = startY;
    this.pointerId = pointerId;
    this.metrics = metrics;
    this.onStart = onStart;
    this.finalXPercent = metrics.leftPercent;
    this.finalYPercent = metrics.topPercent;
  }

  public static create(
    el: HTMLElement,
    startX: number,
    startY: number,
    pointerId: number,
    onStart?: () => void,
  ): DragGesture {
    return new DragGesture(startX, startY, pointerId, measureElement(el), onStart);
  }

  public get hasDragged(): boolean {
    return this.dragStarted;
  }

  public toTransform(clientX: number, clientY: number): string | null {
    const {
      parentWidth,
      parentHeight,
      leftPercent,
      topPercent,
      elementWidthPercent,
      elementHeightPercent,
    } = this.metrics;

    const deltaXPixels = clientX - this.startX;
    const deltaYPixels = clientY - this.startY;

    if (!this.dragStarted && Math.hypot(deltaXPixels, deltaYPixels) >= DRAG_THRESHOLD_PX) {
      this.dragStarted = true;
      this.onStart?.();
    }

    if (!this.dragStarted) return null;

    const deltaXPercent = toPercent(deltaXPixels, parentWidth);
    const deltaYPercent = toPercent(deltaYPixels, parentHeight);

    this.finalXPercent = clampPercent(leftPercent + deltaXPercent, elementWidthPercent);
    this.finalYPercent = clampPercent(topPercent + deltaYPercent, elementHeightPercent);

    const translateX = percentToPixels(this.finalXPercent - leftPercent, parentWidth);
    const translateY = percentToPixels(this.finalYPercent - topPercent, parentHeight);

    return `translate(${translateX.toString()}px, ${translateY.toString()}px)`;
  }

  public start(el: HTMLElement, captureEl: Element = el): void {
    el.style.willChange = 'transform';
    el.style.userSelect = 'none';
    this.captureEl = captureEl;

    if (!this.captureEl.hasPointerCapture(this.pointerId)) {
      this.captureEl.setPointerCapture(this.pointerId);
    }
  }

  public finish(el: HTMLElement): void {
    el.style.willChange = 'auto';
    el.style.userSelect = '';
    el.style.transform = '';

    const captured = this.captureEl ?? el;
    if (captured.hasPointerCapture(this.pointerId)) {
      captured.releasePointerCapture(this.pointerId);
    }
  }

  public position(): DragPosition {
    return { xPercent: this.finalXPercent, yPercent: this.finalYPercent };
  }
}
