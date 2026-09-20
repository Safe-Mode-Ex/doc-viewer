import { measureElement } from './measure';

function makeParentRect(): DOMRect {
  return { left: 0, top: 0, width: 200, height: 200 } as unknown as DOMRect;
}

function makeElementRect(): DOMRect {
  return { left: 40, top: 40, width: 40, height: 20 } as unknown as DOMRect;
}

function makeElement(): HTMLElement {
  const parent = {
    getBoundingClientRect: makeParentRect,
  } as unknown as HTMLElement;

  return {
    parentElement: parent,
    offsetWidth: 40,
    offsetHeight: 20,
    getBoundingClientRect: makeElementRect,
  } as unknown as HTMLElement;
}

describe('measureElement', () => {
  it('computes metrics from element and parent rects', () => {
    expect(measureElement(makeElement())).toEqual({
      parentWidth: 200,
      parentHeight: 200,
      leftPercent: 20,
      topPercent: 20,
      elementWidthPercent: 20,
      elementHeightPercent: 10,
    });
  });

  it('falls back to sized one and zero position without a parent', () => {
    const el = {
      parentElement: null,
      offsetWidth: 40,
      offsetHeight: 20,
      getBoundingClientRect: () => ({ left: 0, top: 0 } as DOMRect),
    } as unknown as HTMLElement;

    expect(measureElement(el)).toEqual({
      parentWidth: 1,
      parentHeight: 1,
      leftPercent: 0,
      topPercent: 0,
      elementWidthPercent: 4000,
      elementHeightPercent: 2000,
    });
  });
});