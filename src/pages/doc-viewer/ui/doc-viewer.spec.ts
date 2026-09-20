import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { HTTP_TOKEN } from '@shared/api';
import { Document } from '@shared/model';
import { DocViewer } from './doc-viewer';
import { DocViewerFacade } from '../model/doc-viewer-facade';

const document: Document = {
  name: 'Test document',
  pages: [{ number: 1, imageUrl: 'assets/page-1.png' }],
};

describe('DocViewer', () => {
  let fixture: ComponentFixture<DocViewer>;
  let component: DocViewer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocViewer],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        { provide: HTTP_TOKEN, useValue: { get: () => Promise.resolve(document) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should open dialog to add new annotation if no other active aditing', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Новая аннотация');

    const region = annotationsRegion();
    region.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    region.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(promptSpy).toHaveBeenCalledOnce();
    expect(facadeOf(component).annotations()).toHaveLength(1);
    expect(facadeOf(component).annotations()[0].content).toBe('Новая аннотация');
  });

  it('should not open dialog to add new annotation if has other active aditing', async () => {
    facadeOf(component).addTextAnnotation(1, 'Тестовая аннотация');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = elementByCss('.annotation__content');
    content.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
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

  function annotationsRegion(): HTMLElement {
    return elementByCss('.page__annotations');
  }

  function elementByCss(selector: string): HTMLElement {
    return fixture.debugElement.query(By.css(selector)).nativeElement as HTMLElement;
  }

  function facadeOf(viewer: DocViewer): DocViewerFacade {
    return (viewer as unknown as { facade: DocViewerFacade }).facade;
  }
});
