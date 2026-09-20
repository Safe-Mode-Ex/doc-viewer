import { Component, input, output, signal, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isEnterKey, isEscKey } from '@shared/lib';

@Component({
  selector: 'app-text-annotation',
  imports: [FormsModule],
  templateUrl: './text-annotation.html',
  styleUrls: ['./text-annotation.scss'],
})
export class TextAnnotation {
  private static readonly DOUBLE_TAP_DELAY_MS = 300;
  private static readonly DOUBLE_TAP_DISTANCE_PX = 12;

  public content = input.required<string>();

  public delete = output();
  public updateContent = output<string>();
  public editing = output<boolean>();

  protected readonly isEditing = signal<boolean>(false);
  protected readonly editableText = signal<string>('');

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  private lastTapAt = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  public constructor() {
    effect(() => {
      if (this.isEditing()) {
        const inputEl = this.editInput();
        if (inputEl) {
          inputEl.nativeElement.focus();
        }
      }
    });
  }

  protected startEdit(evt: Event): void {
    if (this.isEditing()) {
      return;
    }

    evt.stopPropagation();
    this.editableText.set(this.content());
    this.isEditing.set(true);
    this.editing.emit(true);
  }

  protected onTap(evt: MouseEvent): void {
    const now = performance.now();
    const isDoubleTap =
      now - this.lastTapAt <= TextAnnotation.DOUBLE_TAP_DELAY_MS &&
      Math.hypot(evt.clientX - this.lastTapX, evt.clientY - this.lastTapY) <=
        TextAnnotation.DOUBLE_TAP_DISTANCE_PX;

    this.lastTapAt = now;
    this.lastTapX = evt.clientX;
    this.lastTapY = evt.clientY;

    if (isDoubleTap) {
      this.lastTapAt = 0;
      this.startEdit(evt);
    }
  }

  protected saveEdit(): void {
    if (!this.isEditing()) {
      return;
    }

    const trimmed = this.editableText().trim();
    if (trimmed && trimmed !== this.content()) {
      this.updateContent.emit(trimmed);
    }
    this.isEditing.set(false);
    this.editing.emit(false);
  }

  protected onKeyDown(evt: KeyboardEvent): void {
    evt.stopPropagation();

    if (isEscKey(evt.key)) {
      this.isEditing.set(false);
      this.editing.emit(false);
      return;
    }

    if (isEnterKey(evt.key)) {
      evt.preventDefault();
      this.saveEdit();
    }
  }

  protected onDeleteClick(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.delete.emit();
  }
}
