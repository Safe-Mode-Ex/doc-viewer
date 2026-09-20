import { Directive, ElementRef, inject, output, OnInit, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, animationFrameScheduler } from 'rxjs';
import { map, switchMap, takeUntil, finalize, auditTime, filter } from 'rxjs/operators';
import { DRAG_THRESHOLD_PX, PIXELS_PER_STEP } from './const';
import { clampPercent, toPercent, percentToPixels } from './math';
import { DragPosition, DragMetrics } from './types';
import { Key } from '../keyboard/enums';

@Directive({
  selector: '[appDraggable]',
  host: {
    '[attr.tabindex]': '0',
    '[attr.role]': '"slider"',
    '[attr.aria-label]': '"Интерфейс перетаскиваемого элемента"',
    '[style.touch-action]': '"none"',
  },
})
export class DraggableDirective implements OnInit {
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  public dragEnd = output<DragPosition>();

  private isDragging = false;

  public ngOnInit(): void {
    const el = this.toPositionedElement();
    this.watchPointerDrag(el);
    this.watchKeyboardDrag(el);
  }

  private toPositionedElement(): HTMLElement {
    const el = this.elementRef.nativeElement as HTMLElement;
    const currentWindow = this.document.defaultView;

    if (currentWindow?.getComputedStyle(el).position === 'static') {
      el.style.position = 'absolute';
    }

    return el;
  }

  private watchPointerDrag(el: HTMLElement): void {
    const targetBody = this.document.body;
    const pointermove$ = fromEvent<PointerEvent>(targetBody, 'pointermove');
    const pointerup$ = fromEvent<PointerEvent>(targetBody, 'pointerup');
    const pointercancel$ = fromEvent<PointerEvent>(targetBody, 'pointercancel');
    const lostpointercapture$ = fromEvent<PointerEvent>(el, 'lostpointercapture');

    fromEvent<PointerEvent>(el, 'pointerdown')
      .pipe(
        filter(() => !this.isDragging),
        map((startEvent) => ({
          startX: startEvent.clientX,
          startY: startEvent.clientY,
          pointerId: startEvent.pointerId,
          metrics: this.measure(el),
        })),
        switchMap(({ startX, startY, pointerId, metrics }) => {
          const {
            parentWidth,
            parentHeight,
            leftPercent,
            topPercent,
            elementWidthPercent,
            elementHeightPercent,
          } = metrics;

          let finalXPercent = leftPercent;
          let finalYPercent = topPercent;
          let dragStarted = false;

          const startDrag = () => {
            if (dragStarted) return;
            dragStarted = true;
            this.startPointerDrag(el, pointerId);
          };

          return pointermove$.pipe(
            map((moveEvent) => {
              const deltaXPixels = moveEvent.clientX - startX;
              const deltaYPixels = moveEvent.clientY - startY;

              if (!dragStarted && Math.hypot(deltaXPixels, deltaYPixels) >= DRAG_THRESHOLD_PX) {
                startDrag();
              }

              if (!dragStarted) return null;

              const deltaXPercent = toPercent(deltaXPixels, parentWidth);
              const deltaYPercent = toPercent(deltaYPixels, parentHeight);

              finalXPercent = clampPercent(leftPercent + deltaXPercent, elementWidthPercent);
              finalYPercent = clampPercent(topPercent + deltaYPercent, elementHeightPercent);

              const translateX = percentToPixels(finalXPercent - leftPercent, parentWidth);
              const translateY = percentToPixels(finalYPercent - topPercent, parentHeight);

              return `translate(${translateX.toString()}px, ${translateY.toString()}px)`;
            }),
            filter((value): value is string => value !== null),
            auditTime(0, animationFrameScheduler),
            map((transformString) => {
              el.style.transform = transformString;
            }),
            takeUntil(merge(pointerup$, pointercancel$, lostpointercapture$)),
            finalize(() => {
              this.finishPointerDrag(el, pointerId);

              if (dragStarted) {
                this.applyPosition(el, finalXPercent, finalYPercent);
              }
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private watchKeyboardDrag(el: HTMLElement): void {
    fromEvent<KeyboardEvent>(el, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evt) => {
        if (this.isEditableTarget(evt.target)) {
          return;
        }
        this.moveByKey(el, evt);
      });
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }

    const targetElement = target as HTMLElement;
    return (
      targetElement.tagName === 'INPUT' ||
      targetElement.tagName === 'TEXTAREA' ||
      targetElement.isContentEditable
    );
  }

  private moveByKey(el: HTMLElement, evt: KeyboardEvent): void {
    const parent = el.parentElement;
    if (!parent) return;

    const {
      parentWidth,
      parentHeight,
      leftPercent,
      topPercent,
      elementWidthPercent,
      elementHeightPercent,
    } = this.measure(el);

    const stepXPercent = toPercent(PIXELS_PER_STEP, parentWidth);
    const stepYPercent = toPercent(PIXELS_PER_STEP, parentHeight);

    let newLeft = leftPercent;
    let newTop = topPercent;

    switch (evt.key) {
      case Key.LEFT:
        newLeft = clampPercent(leftPercent - stepXPercent, elementWidthPercent);
        break;
      case Key.RIGHT:
        newLeft = clampPercent(leftPercent + stepXPercent, elementWidthPercent);
        break;
      case Key.UP:
        newTop = clampPercent(topPercent - stepYPercent, elementHeightPercent);
        break;
      case Key.DOWN:
        newTop = clampPercent(topPercent + stepYPercent, elementHeightPercent);
        break;
      default:
        return;
    }

    evt.preventDefault();

    if (newLeft !== leftPercent || newTop !== topPercent) {
      this.applyPosition(el, newLeft, newTop);
    }
  }

  private measure(el: HTMLElement): DragMetrics {
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

  private startPointerDrag(el: HTMLElement, pointerId: number): void {
    this.isDragging = true;
    el.style.willChange = 'transform';
    el.style.userSelect = 'none';

    if (!el.hasPointerCapture(pointerId)) {
      el.setPointerCapture(pointerId);
    }
  }

  private finishPointerDrag(el: HTMLElement, pointerId: number): void {
    this.isDragging = false;
    el.style.willChange = 'auto';
    el.style.userSelect = '';
    el.style.transform = '';

    if (el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }
  }

  private applyPosition(el: HTMLElement, leftPercent: number, topPercent: number): void {
    el.style.left = `${leftPercent.toString()}%`;
    el.style.top = `${topPercent.toString()}%`;
    this.dragEnd.emit({ xPercent: leftPercent, yPercent: topPercent });
  }
}
