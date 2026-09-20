import { Component, inject, signal, resource, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@shared/api';
import { DraggableDirective } from '@shared/lib';
import { Key } from '@shared/lib/keyboard/enums';
import { DocViewerFacade } from '../model/doc-viewer-facade';
import { Toolbar } from './toolbar/toolbar';
import { TextAnnotation } from './text-annotation/text-annotation';

@Component({
  selector: 'app-doc-viewer-page',
  imports: [Toolbar, DraggableDirective, TextAnnotation],
  providers: [DocViewerFacade],
  templateUrl: './doc-viewer.html',
  styleUrls: ['./doc-viewer.scss'],
})
export class DocViewer {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(DocViewerFacade);
  private readonly apiService = inject(ApiService);

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
    clearTimeout(this.zoomTimeoutId);
    this.zoomTimeoutId = setTimeout(() => {
      if (direction === 'in') {
        this.facade.zoomIn();
      } else {
        this.facade.zoomOut();
      }
    }, 200);
  }

  protected promptNewAnnotationByKey(pageNumber: number, evt: KeyboardEvent): void {
    if (evt.key !== Key.ENTER && evt.key !== Key.SPACE) {
      return;
    }

    evt.preventDefault();
    this.promptNewAnnotation(pageNumber, evt);
  }

  protected promptNewAnnotation(pageNumber: number, evt: Event): void {
    if ((evt.target as HTMLElement).classList.contains('page__annotations')) {
      const text = prompt('Введите текст аннотации:');
      if (text?.trim()) {
        this.facade.addTextAnnotation(pageNumber, text.trim());
      }
    }
  }
}
