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
  }

  protected onKeyDown(evt: KeyboardEvent): void {
    if (isEnterKey(evt.key)) {
      evt.stopPropagation();
      evt.preventDefault();
      this.saveEdit();
    } else if (isEscKey(evt.key)) {
      evt.stopPropagation();
      this.isEditing.set(false);
    }
  }

  protected onDeleteClick(evt: Event): void {
    evt.preventDefault();
    this.delete.emit();
  }
}
