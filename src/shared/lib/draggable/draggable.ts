import { Directive, ElementRef, inject, output, OnInit, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, animationFrameScheduler } from 'rxjs';
import { map, switchMap, takeUntil, finalize, observeOn, filter } from 'rxjs/operators';

const PIXELS_PER_STEP = 8;

export interface DragPosition {
  xPercent: number;
  yPercent: number;
}

@Directive({
  selector: '[appDraggable]',
  host: {
    '[attr.tabindex]': '0',
    '[attr.role]': '"slider"',
    '[attr.aria-label]': '"Интерфейс перетаскиваемой аннотации"',
    '[style.touch-action]': '"none"',
  },
})
export class DraggableDirective implements OnInit {
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  public dragEnd = output<DragPosition>();

  public ngOnInit(): void {
    const el = this.elementRef.nativeElement as HTMLElement;

    const currentWindow = this.document.defaultView;
    const targetBody = this.document.body;

    if (currentWindow) {
      const computedStyle = currentWindow.getComputedStyle(el);
      if (computedStyle.position === 'static') {
        el.style.position = 'absolute';
      }
    }

    let isDragging = false;

    const pointerdown$ = fromEvent<PointerEvent>(el, 'pointerdown');
    const pointermove$ = fromEvent<PointerEvent>(targetBody, 'pointermove');
    const pointerup$ = fromEvent<PointerEvent>(targetBody, 'pointerup');
    const pointercancel$ = fromEvent<PointerEvent>(targetBody, 'pointercancel');
    const lostpointercapture$ = fromEvent<PointerEvent>(el, 'lostpointercapture');

    pointerdown$
      .pipe(
        filter(() => !isDragging),
        map((startEvent) => {
          startEvent.preventDefault();
          isDragging = true;

          el.setPointerCapture(startEvent.pointerId);
          el.style.willChange = 'left, top';

          const parent = el.parentElement;
          const parentRect = parent?.getBoundingClientRect();
          const parentWidth = parentRect?.width ?? 1;
          const parentHeight = parentRect?.height ?? 1;

          const currentRect = el.getBoundingClientRect();
          const initialLeftPercent = parentRect
            ? ((currentRect.left - parentRect.left) / parentWidth) * 100
            : 0;
          const initialTopPercent = parentRect
            ? ((currentRect.top - parentRect.top) / parentHeight) * 100
            : 0;

          const elementWidthPercent = (el.offsetWidth / parentWidth) * 100;
          const elementHeightPercent = (el.offsetHeight / parentHeight) * 100;

          return {
            startX: startEvent.clientX,
            startY: startEvent.clientY,
            initialLeftPercent,
            initialTopPercent,
            parentWidth,
            parentHeight,
            elementWidthPercent,
            elementHeightPercent,
            pointerId: startEvent.pointerId,
          };
        }),
        switchMap(
          ({
            startX,
            startY,
            initialLeftPercent,
            initialTopPercent,
            parentWidth,
            parentHeight,
            elementWidthPercent,
            elementHeightPercent,
            pointerId,
          }) => {
            let finalXPercent = initialLeftPercent;
            let finalYPercent = initialTopPercent;

            return pointermove$.pipe(
              observeOn(animationFrameScheduler),
              map((moveEvent) => {
                const deltaXPixels = moveEvent.clientX - startX;
                const deltaYPixels = moveEvent.clientY - startY;

                const deltaXPercent = (deltaXPixels / parentWidth) * 100;
                const deltaYPercent = (deltaYPixels / parentHeight) * 100;

                finalXPercent = Math.max(
                  0,
                  Math.min(100 - elementWidthPercent, initialLeftPercent + deltaXPercent),
                );
                finalYPercent = Math.max(
                  0,
                  Math.min(100 - elementHeightPercent, initialTopPercent + deltaYPercent),
                );

                el.style.left = `${finalXPercent.toString()}%`;
                el.style.top = `${finalYPercent.toString()}%`;
              }),
              takeUntil(
                merge(
                  pointerup$.pipe(observeOn(animationFrameScheduler)),
                  pointercancel$,
                  lostpointercapture$,
                ),
              ),
              finalize(() => {
                isDragging = false;
                el.style.willChange = 'auto';

                el.releasePointerCapture(pointerId);
                this.dragEnd.emit({ xPercent: finalXPercent, yPercent: finalYPercent });
              }),
            );
          },
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    const keydown$ = fromEvent<KeyboardEvent>(el, 'keydown');

    keydown$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evt) => {
      const parent = el.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const parentWidth = parentRect.width || 1;
      const parentHeight = parentRect.height || 1;

      const currentRect = el.getBoundingClientRect();
      const currentLeftPercent = ((currentRect.left - parentRect.left) / parentWidth) * 100;
      const currentTopPercent = ((currentRect.top - parentRect.top) / parentHeight) * 100;

      const elementWidthPercent = (el.offsetWidth / parentWidth) * 100;
      const elementHeightPercent = (el.offsetHeight / parentHeight) * 100;

      const stepXPercent = (PIXELS_PER_STEP / parentWidth) * 100;
      const stepYPercent = (PIXELS_PER_STEP / parentHeight) * 100;

      let newLeft = currentLeftPercent;
      let newTop = currentTopPercent;

      switch (evt.key) {
        case 'ArrowLeft':
          newLeft = Math.max(0, currentLeftPercent - stepXPercent);
          break;
        case 'ArrowRight':
          newLeft = Math.min(100 - elementWidthPercent, currentLeftPercent + stepXPercent);
          break;
        case 'ArrowUp':
          newTop = Math.max(0, currentTopPercent - stepYPercent);
          break;
        case 'ArrowDown':
          newTop = Math.min(100 - elementHeightPercent, currentTopPercent + stepYPercent);
          break;
        default:
          return;
      }

      evt.preventDefault();

      if (newLeft !== currentLeftPercent || newTop !== currentTopPercent) {
        el.style.left = `${newLeft.toString()}%`;
        el.style.top = `${newTop.toString()}%`;
        this.dragEnd.emit({ xPercent: newLeft, yPercent: newTop });
      }
    });
  }
}
