import { Component, inject, signal, resource, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@shared/api';
import { DraggableDirective } from '@shared/lib';
import { DocViewerFacade } from '../model/doc-viewer-facade';
import { Toolbar } from './toolbar/toolbar';
import { TextAnnotation } from './text-annotation/text-annotation';

@Component({
  imports: [Toolbar, DraggableDirective, TextAnnotation],
  providers: [DocViewerFacade],
  templateUrl: './doc-viewer.html',
  styleUrls: ['./doc-viewer.scss'],
})
export class DocViewerPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(DocViewerFacade);
  private readonly apiService = inject(ApiService);

  protected readonly tempScale = signal<number>(1);
  protected readonly isZooming = signal<boolean>(false);
  private zoomTimeoutId = 0;

  protected readonly documentId = signal<string>(this.route.snapshot.paramMap.get('id') ?? '1');

  protected readonly documentLoader = resource({
    params: () => ({ id: this.documentId() }),
    loader: ({ params }) => this.apiService.getDocumentById(params.id),
  });

  public constructor() {
    effect(() => {
      const doc = this.documentLoader.value();
      if (doc) {
        this.facade.initializeDocument(doc.name, doc.pages);
      }
    });
  }

  protected changeZoom(direction: 'in' | 'out'): void {
    this.isZooming.set(true);
    const step = direction === 'in' ? 0.1 : -0.1;
    this.tempScale.update((scale) => Math.max(0.5, Math.min(2, scale + step)));

    clearTimeout(this.zoomTimeoutId);
    this.zoomTimeoutId = setTimeout(() => {
      if (direction === 'in') {
        this.facade.zoomIn();
      } else {
        this.facade.zoomOut();
      }
      this.tempScale.set(1);
      this.isZooming.set(false);
    }, 200);
  }

  protected promptNewAnnotation(pageNumber: number, event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('annotations-overlay')) {
      const text = prompt('Введите текст аннотации:');
      if (text?.trim()) {
        this.facade.addTextAnnotation(pageNumber, text.trim());
      }
    }
  }
}
