import { vi, describe, it, expect } from 'vitest';
import { DragGesture } from './drag-gesture';

function makeParentRect(): DOMRect {
  return { left: 0, top: 0, width: 200, height: 200 } as unknown as DOMRect;
}

function makeElementRect(): DOMRect {
  return { left: 40, top: 40, width: 40, height: 20 } as unknown as DOMRect;
}

function makeElement(hasCapture = false): {
  el: HTMLElement;
  hasPointerCapture: ReturnType<typeof vi.fn>;
  setPointerCapture: ReturnType<typeof vi.fn>;
  releasePointerCapture: ReturnType<typeof vi.fn>;
} {
  const hasPointerCapture = vi.fn().mockReturnValue(hasCapture);
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();

  const parent = {
    getBoundingClientRect: makeParentRect,
  } as unknown as HTMLElement;

  const el = {
    parentElement: parent,
    offsetWidth: 40,
    offsetHeight: 20,
    getBoundingClientRect: makeElementRect,
    style: {},
    hasPointerCapture,
    setPointerCapture,
    releasePointerCapture,
  } as unknown as HTMLElement;

  return { el, hasPointerCapture, setPointerCapture, releasePointerCapture };
}

describe('DragGesture.toTransform', () => {
  it('should return null below the drag threshold and not start', () => {
    const { el } = makeElement();
    const onStart = vi.fn();
    const gesture = DragGesture.create(el, 100, 100, 1, onStart);

    expect(gesture.toTransform(103, 100)).toBeNull();
    expect(gesture.hasDragged).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('should start once at the threshold and return a translate string', () => {
    const { el } = makeElement();
    const onStart = vi.fn();
    const gesture = DragGesture.create(el, 100, 100, 1, onStart);

    expect(gesture.toTransform(103, 104)).toBe('translate(3px, 4px)');
    expect(gesture.hasDragged).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);

    expect(gesture.toTransform(104, 104)).toBe('translate(4px, 4px)');
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('should clamp the final position and transform at the edges', () => {
    const { el } = makeElement();
    const gesture = DragGesture.create(el, 100, 100, 1);

    expect(gesture.toTransform(1100, 1100)).toBe('translate(120px, 140px)');
    expect(gesture.position()).toEqual({ xPercent: 80, yPercent: 90 });
  });

  it('should track the final position across moves', () => {
    const { el } = makeElement();
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.toTransform(103, 104);
    gesture.toTransform(200, 200);

    expect(gesture.position()).toEqual({ xPercent: 70, yPercent: 70 });
  });
});

describe('DragGesture.start / finish', () => {
  it('should apply styles and capture the pointer on start', () => {
    const { el, setPointerCapture } = makeElement(false);
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.start(el);

    expect(el.style.willChange).toBe('transform');
    expect(el.style.userSelect).toBe('none');
    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('should not capture when the pointer is already captured', () => {
    const { el, setPointerCapture } = makeElement(true);
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.start(el);

    expect(setPointerCapture).not.toHaveBeenCalled();
  });

  it('should capture the provided capture element instead of the dragged element', () => {
    const { el, setPointerCapture } = makeElement(false);
    const targetSetPointerCapture = vi.fn();
    const target = {
      hasPointerCapture: () => false,
      setPointerCapture: targetSetPointerCapture,
    } as unknown as HTMLElement;
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.start(el, target);

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(targetSetPointerCapture).toHaveBeenCalledWith(1);
  });

  it('should release the pointer from the captured element on finish', () => {
    const { el } = makeElement(false);
    const targetReleasePointerCapture = vi.fn();
    const target = {
      hasPointerCapture: () => true,
      releasePointerCapture: targetReleasePointerCapture,
    } as unknown as HTMLElement;
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.start(el, target);
    gesture.finish(el);

    expect(targetReleasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('should reset styles and release the pointer on finish', () => {
    const { el, releasePointerCapture } = makeElement(true);
    const gesture = DragGesture.create(el, 100, 100, 1);

    gesture.finish(el);

    expect(el.style.willChange).toBe('auto');
    expect(el.style.userSelect).toBe('');
    expect(el.style.transform).toBe('');
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });
});
