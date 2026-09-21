import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Annotation, AnnotationType } from '@shared/model';
import { AnnotationEvent } from './annotation-type';
import { AnnotationView } from './annotation-view';
import { TextAnnotation } from '../text-annotation/text-annotation';

describe('AnnotationView', () => {
  let fixture: ComponentFixture<AnnotationView>;
  let onEvent: (event: AnnotationEvent) => void;

  const textAnnotation: Annotation = {
    id: 'ann_1',
    pageNumber: 1,
    type: 'text',
    x: 35,
    y: 20,
    content: 'Начальный текст',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotationView],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnotationView);
    onEvent = vi.fn();
    fixture.componentInstance.events.subscribe(onEvent);
    fixture.componentRef.setInput('annotation', textAnnotation);
    await flush();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  async function flush(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function setAnnotation(annotation: Annotation): void {
    fixture.componentRef.setInput('annotation', annotation);
  }

  function viewedText(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function textAnnotationComponent(): TextAnnotation {
    return fixture.debugElement.query(By.directive(TextAnnotation))
      .componentInstance as TextAnnotation;
  }

  describe('rendering by type', () => {
    it('should render the registered component for the text type', () => {
      expect(textAnnotationComponent()).toBeTruthy();
      expect(viewedText().textContent).toContain('Начальный текст');
    });

    it('should render the fallback placeholder for an unknown type', async () => {
      setAnnotation({ ...textAnnotation, type: 'highlight' as unknown as AnnotationType });
      await flush();

      expect(fixture.debugElement.query(By.directive(TextAnnotation))).toBeNull();
      expect(viewedText().textContent).toContain('Неизвестный тип аннотации');
    });
  });

  describe('content updates', () => {
    it('should re-render the annotation component with the new content', async () => {
      setAnnotation({ ...textAnnotation, content: 'Обновлённый текст' });
      await flush();

      expect(viewedText().textContent).toContain('Обновлённый текст');
      expect(viewedText().textContent).not.toContain('Начальный текст');
    });
  });

  describe('outputs', () => {
    it('should forward the delete event', async () => {
      const target = fixture.debugElement.query(By.css('[aria-label="Удалить аннотацию"]'));
      (target.nativeElement as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await flush();

      expect(onEvent).toHaveBeenCalledOnce();
      expect(onEvent).toHaveBeenCalledWith({ kind: 'delete' });
    });

    it('should forward the updateContent event', async () => {
      textAnnotationComponent().events.emit({ kind: 'updateContent', content: 'Новый текст' });
      await flush();

      expect(onEvent).toHaveBeenCalledOnce();
      expect(onEvent).toHaveBeenCalledWith({ kind: 'updateContent', content: 'Новый текст' });
    });

    it('should forward the editing event', async () => {
      textAnnotationComponent().events.emit({ kind: 'editing', editing: true });
      await flush();

      expect(onEvent).toHaveBeenCalledOnce();
      expect(onEvent).toHaveBeenCalledWith({ kind: 'editing', editing: true });
    });
  });
});
