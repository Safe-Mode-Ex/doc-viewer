import { InputSignal, OutputEmitterRef } from '@angular/core';
import { Annotation } from '@shared/model';

export const AnnotationEventKind = {
  DELETE: 'delete',
  UPDATE_CONTENT: 'updateContent',
  EDITING: 'editing',
} as const;

export type AnnotationEvent =
  | { kind: typeof AnnotationEventKind.DELETE }
  | { kind: typeof AnnotationEventKind.UPDATE_CONTENT; content: string }
  | { kind: typeof AnnotationEventKind.EDITING; editing: boolean };

export interface AnnotationComponent {
  annotation: InputSignal<Annotation>;
  events: OutputEmitterRef<AnnotationEvent>;
}
