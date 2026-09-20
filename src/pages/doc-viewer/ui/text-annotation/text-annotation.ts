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
  public content = input.required<string>();

  public delete = output();
  public updateContent = output<string>();
  public editing = output<boolean>();

  protected readonly isEditing = signal<boolean>(false);
  protected readonly editableText = signal<string>('');

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

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
    this.delete.emit();
  }
}
