import { Directive, ElementRef, inject, output, OnInit, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, animationFrameScheduler } from 'rxjs';
import { map, switchMap, takeUntil, finalize, auditTime, filter } from 'rxjs/operators';
import { PIXELS_PER_STEP } from './const';
import { clampPercent, toPercent } from './math';
import { DragGesture } from './drag-gesture';
import { measureElement } from './measure';
import { DragPosition } from './types';
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
        })),
        switchMap(({ startX, startY, pointerId }) => {
          const gesture = DragGesture.create(el, startX, startY, pointerId, () => {
            gesture.start(el);
            this.isDragging = true;
          });

          return pointermove$.pipe(
            map((moveEvent) => gesture.toTransform(moveEvent.clientX, moveEvent.clientY)),
            filter((value): value is string => value !== null),
            auditTime(0, animationFrameScheduler),
            map((transformString) => {
              el.style.transform = transformString;
            }),
            takeUntil(merge(pointerup$, pointercancel$, lostpointercapture$)),
            finalize(() => {
              gesture.finish(el);
              this.isDragging = false;

              if (gesture.hasDragged) {
                const { xPercent, yPercent } = gesture.position();
                this.applyPosition(el, xPercent, yPercent);
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
    } = measureElement(el);

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

  private applyPosition(el: HTMLElement, leftPercent: number, topPercent: number): void {
    el.style.left = `${leftPercent.toString()}%`;
    el.style.top = `${topPercent.toString()}%`;
    this.dragEnd.emit({ xPercent: leftPercent, yPercent: topPercent });
  }
}
