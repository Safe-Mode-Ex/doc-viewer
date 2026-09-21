import { Component, input, output } from '@angular/core';
import { Annotation } from '@shared/model';
import { AnnotationComponent, AnnotationEvent } from '../annotation/annotation-type';

@Component({
  selector: 'app-unsupported-annotation',
  template: '<span class="unsupported-annotation">Неизвестный тип аннотации</span>',
  styles: [
    `
      .unsupported-annotation {
        padding: 4px 8px;
        background: #fff3cd;
        color: #856404;
        border: 1px dashed #e0a800;
        border-radius: 4px;
        font-size: 12px;
      }
    `,
  ],
})
export class UnsupportedAnnotationComponent implements AnnotationComponent {
  public readonly annotation = input.required<Annotation>();
  public readonly events = output<AnnotationEvent>();
}
