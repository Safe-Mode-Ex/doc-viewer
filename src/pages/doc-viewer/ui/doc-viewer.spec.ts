import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { HTTP_TOKEN } from '@shared/api';
import { HttpClient } from '@shared/api/http-token';
import { Document } from '@shared/model';
import { Key } from '@shared/lib';
import { DocViewer } from './doc-viewer';
import { DocViewerFacade } from '../model/doc-viewer-facade';

const document: Document = {
  name: 'Test document',
  pages: [{ number: 1, imageUrl: 'assets/page-1.png' }],
};

const realImage = globalThis.Image;

let lastImageSrc: string | undefined = undefined;
let fakeImageSize = { width: 595, height: 842 };

class FakeImage {
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  public set src(value: string) {
    lastImageSrc = value;
    queueMicrotask(() => this.onload?.());
  }

  public get src(): string {
    return lastImageSrc ?? '';
  }

  public get naturalWidth(): number {
    return fakeImageSize.width;
  }

  public get naturalHeight(): number {
    return fakeImageSize.height;
  }
}

interface FixtureOptions {
  httpClient?: HttpClient;
  routeId?: string;
  awaitStable?: boolean;
}

function httpClientMock(get: (url: string) => Promise<Document>): HttpClient {
  return { get } as unknown as HttpClient;
}

describe('DocViewer', () => {
  let fixture: ComponentFixture<DocViewer>;
  let component: DocViewer;

  beforeEach(() => {
    lastImageSrc = undefined;
    fakeImageSize = { width: 595, height: 842 };
    globalThis.Image = FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = realImage;
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  async function createFixture(options: FixtureOptions = {}): Promise<void> {
    const httpClient = options.httpClient ?? httpClientMock(() => Promise.resolve(document));
    const routeId = options.routeId ?? '1';
    const awaitStable = options.awaitStable ?? true;

    await TestBed.configureTestingModule({
      imports: [DocViewer],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (): string => routeId } } },
        },
        { provide: HTTP_TOKEN, useValue: httpClient },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();

    if (awaitStable) {
      await flushChanges();
    }
  }

  async function flushChanges(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('creation', () => {
    it('should create the component', async () => {
      await createFixture();
      expect(component).toBeTruthy();
    });
  });

  describe('document loading', () => {
    it('should show loading status and hide the viewer until the document is received', async () => {
      let resolveRequest!: (doc: Document) => void;

      await createFixture({
        httpClient: httpClientMock(
          () => new Promise<Document>((resolve) => (resolveRequest = resolve)),
        ),
        awaitStable: false,
      });

      expect(elementByCss('.status').textContent).toContain('Загрузка документа');
      expect(fixture.debugElement.query(By.css('.viewer'))).toBeNull();

      resolveRequest(document);
      await flushChanges();

      expect(fixture.debugElement.query(By.css('.viewer'))).not.toBeNull();
    });

    it('should show an error when the document is not found', async () => {
      const httpClient = httpClientMock(() => Promise.reject(new Error('404')));

      await createFixture({ httpClient });

      expect(elementByCss('.status--error').textContent).toContain('Ошибка: Документ не найден.');
    });

    it('should use the id from the route for the request', async () => {
      const getSpy = vi.fn((url: string): Promise<Document> => {
        expect(url).toBe('/api/v1/documents/45');
        return Promise.resolve(document);
      });

      await createFixture({ httpClient: httpClientMock(getSpy), routeId: '45' });

      expect(getSpy).toHaveBeenCalledWith('/api/v1/documents/45');
    });
  });

  describe('page proportions', () => {
    it('should set aspect-ratio from the real size of the first page', async () => {
      await createFixture();
      await flushChanges();

      expect(lastImageSrc).toBe('assets/page-1.png');
      expect(elementByCss('.document__page').style.aspectRatio).toBe('595 / 842');
    });
  });

  describe('zooming', () => {
    it('should zoom in with the plus button', async () => {
      await createFixture();

      expect(facadeOf(component).zoom()).toBe(100);

      control('Увеличить масштаб').click();
      fixture.detectChanges();

      expect(facadeOf(component).zoom()).toBe(110);
      expect(elementByCss('.document__container').style.width).toBe('110%');
      expect(elementByCss('.zoom__indicator').textContent).toContain('110%');
    });

    it('should zoom out with the minus button', async () => {
      await createFixture();

      control('Уменьшить масштаб').click();
      fixture.detectChanges();

      expect(facadeOf(component).zoom()).toBe(90);
      expect(elementByCss('.document__container').style.width).toBe('90%');
    });
  });

  describe('adding an annotation by click', () => {
    it('should open the prompt and add an annotation when there is no active editing', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Новая аннотация');

      const region = annotationsRegion();
      region.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      region.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(promptSpy).toHaveBeenCalledOnce();
      expect(facadeOf(component).annotations()).toHaveLength(1);
      expect(facadeOf(component).annotations()[0].content).toBe('Новая аннотация');
    });

    it('should not open the prompt when there is an active editing', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Тестовая аннотация');
      await flushChanges();

      const content = elementByCss('.annotation__content');
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      const input = elementByCss('.annotation__input') as HTMLInputElement;
      input.focus();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Новая аннотация');

      const region = annotationsRegion();
      region.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      input.blur();
      region.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(promptSpy).not.toHaveBeenCalled();
    });

    it('should not create an annotation when the input is cancelled', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      clickRegion();

      expect(promptSpy).toHaveBeenCalledOnce();
      expect(facadeOf(component).annotations()).toHaveLength(0);
    });

    it('should not create an annotation when the input is empty', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');

      clickRegion();

      expect(promptSpy).toHaveBeenCalledOnce();
      expect(facadeOf(component).annotations()).toHaveLength(0);
    });

    it('should trim whitespace around the input', async () => {
      await createFixture();
      vi.spyOn(window, 'prompt').mockReturnValue('   текст  ');

      clickRegion();

      expect(facadeOf(component).annotations()).toHaveLength(1);
      expect(facadeOf(component).annotations()[0].content).toBe('текст');
    });

    it('should not open the prompt when clicking outside the annotations region', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Новая аннотация');

      elementByCss('.page__image').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(promptSpy).not.toHaveBeenCalled();
      expect(facadeOf(component).annotations()).toHaveLength(0);
    });
  });

  describe('adding an annotation by keyboard', () => {
    it('should open the prompt on Enter key', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Ввод с клавиатуры');

      annotationsRegion().dispatchEvent(
        new KeyboardEvent('keydown', { key: Key.ENTER, bubbles: true }),
      );

      expect(promptSpy).toHaveBeenCalledOnce();
      expect(facadeOf(component).annotations()).toHaveLength(1);
      expect(facadeOf(component).annotations()[0].content).toBe('Ввод с клавиатуры');
    });

    it('should open the prompt on Space key', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      annotationsRegion().dispatchEvent(
        new KeyboardEvent('keydown', { key: Key.SPACE, bubbles: true }),
      );

      expect(promptSpy).toHaveBeenCalledOnce();
    });

    it('should ignore other keys', async () => {
      await createFixture();
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      annotationsRegion().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

      expect(promptSpy).not.toHaveBeenCalled();
    });

    it('should ignore keydown from a nested element without the region class', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Тестовая аннотация');
      await flushChanges();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      elementByCss('.draggable').dispatchEvent(
        new KeyboardEvent('keydown', { key: Key.ENTER, bubbles: true }),
      );

      expect(promptSpy).not.toHaveBeenCalled();
      expect(facadeOf(component).annotations()).toHaveLength(1);
    });
  });

  describe('editing an annotation', () => {
    it('should save the new text on Enter', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Старый текст');
      await flushChanges();

      doubleTapOn('.annotation__content');
      fixture.detectChanges();

      const input = elementByCss('.annotation__input') as HTMLInputElement;
      input.value = 'Новый текст';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: Key.ENTER, bubbles: true }));
      fixture.detectChanges();

      expect(facadeOf(component).annotations()[0].content).toBe('Новый текст');
      expect(elementByCss('.annotation__content').textContent).toContain('Новый текст');
    });

    it('should cancel editing on Escape', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Старый текст');
      await flushChanges();

      doubleTapOn('.annotation__content');
      fixture.detectChanges();

      const input = elementByCss('.annotation__input') as HTMLInputElement;
      input.value = 'Не сохраним';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: Key.ESC, bubbles: true }));
      fixture.detectChanges();

      expect(facadeOf(component).annotations()[0].content).toBe('Старый текст');
      expect(elementByCss('.annotation__content').textContent).toContain('Старый текст');
    });

    it('should not change the text when the value is unchanged', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Тест');
      await flushChanges();

      doubleTapOn('.annotation__content');
      fixture.detectChanges();

      const input = elementByCss('.annotation__input') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: Key.ENTER, bubbles: true }));
      fixture.detectChanges();

      expect(facadeOf(component).annotations()[0].content).toBe('Тест');
    });

    it('should not change the text when the value is empty', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Тест');
      await flushChanges();

      doubleTapOn('.annotation__content');
      fixture.detectChanges();

      const input = elementByCss('.annotation__input') as HTMLInputElement;
      input.value = '   ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: Key.ENTER, bubbles: true }));
      fixture.detectChanges();

      expect(facadeOf(component).annotations()[0].content).toBe('Тест');
    });
  });

  describe('deleting an annotation', () => {
    it('should delete an annotation by its button', async () => {
      await createFixture();
      facadeOf(component).addTextAnnotation(1, 'Тестовая аннотация');
      await flushChanges();

      elementByCss('[aria-label="Удалить аннотацию"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      fixture.detectChanges();

      expect(facadeOf(component).annotations()).toHaveLength(0);
      expect(fixture.debugElement.query(By.css('.annotation__content'))).toBeNull();
    });
  });

  function annotationsRegion(): HTMLElement {
    return elementByCss('.page__annotations');
  }

  function clickRegion(): void {
    const region = annotationsRegion();
    region.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    region.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function control(ariaLabel: string): HTMLButtonElement {
    return elementByCss(`[aria-label="${ariaLabel}"]`) as HTMLButtonElement;
  }

  function elementByCss(selector: string): HTMLElement {
    return fixture.debugElement.query(By.css(selector)).nativeElement as HTMLElement;
  }

  function doubleTapOn(selector: string): void {
    const target = elementByCss(selector);
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function facadeOf(viewer: DocViewer): DocViewerFacade {
    return (viewer as unknown as { facade: DocViewerFacade }).facade;
  }
});
