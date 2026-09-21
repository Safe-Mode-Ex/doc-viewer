import {
  Component,
  ComponentRef,
  effect,
  input,
  OnDestroy,
  output,
  Type,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { Annotation } from '@shared/model';
import { AnnotationComponent, AnnotationEvent } from './annotation-type';
import { getAnnotationComponent } from './annotation-registry';

@Component({
  selector: 'app-annotation-view',
  template: '<ng-container #host />',
})
export class AnnotationView implements OnDestroy {
  public readonly annotation = input.required<Annotation>();

  public readonly events = output<AnnotationEvent>();

  private readonly host = viewChild.required('host', { read: ViewContainerRef });
  private componentRef: ComponentRef<AnnotationComponent> | undefined;

  public constructor() {
    effect(() => {
      this.render();
    });
  }

  private render(): void {
    const annotation = this.annotation();
    const componentType = getAnnotationComponent(annotation.type);

    if (this.componentRef?.componentType !== componentType) {
      this.componentRef?.destroy();
      this.componentRef = this.createAnnotation(componentType);
    }

    this.componentRef.setInput('annotation', annotation);
  }

  private createAnnotation(
    componentType: Type<AnnotationComponent>,
  ): ComponentRef<AnnotationComponent> {
    const ref = this.host().createComponent<AnnotationComponent>(componentType);
    ref.instance.events.subscribe((event) => {
      this.events.emit(event);
    });
    return ref;
  }

  public ngOnDestroy(): void {
    this.componentRef?.destroy();
  }
}
