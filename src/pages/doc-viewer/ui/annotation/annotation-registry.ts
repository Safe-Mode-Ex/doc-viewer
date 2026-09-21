import { Type } from '@angular/core';
import { AnnotationType } from '@shared/model';
import { AnnotationComponent } from './annotation-type';
import { TextAnnotation } from '../text-annotation/text-annotation';
import { UnsupportedAnnotationComponent } from '../unsupported-annotation/unsupported-annotation';

const ANNOTATION_COMPONENT_REGISTRY: ReadonlyMap<
  AnnotationType,
  Type<AnnotationComponent>
> = new Map<AnnotationType, Type<AnnotationComponent>>([['text', TextAnnotation]]);

export function getAnnotationComponent(type: string): Type<AnnotationComponent> {
  return (
    ANNOTATION_COMPONENT_REGISTRY.get(type as AnnotationType) ?? UnsupportedAnnotationComponent
  );
}
