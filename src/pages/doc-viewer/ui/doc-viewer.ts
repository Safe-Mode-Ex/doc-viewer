import { Component, inject, signal, resource, effect, computed } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@shared/api';
import { DraggableDirective, probeImageSize, Key } from '@shared/lib';
import { DocViewerFacade } from '../model/doc-viewer-facade';
import { Toolbar } from './toolbar/toolbar';
import { AnnotationView } from './annotation/annotation-view';
import { AnnotationEvent, AnnotationEventKind } from './annotation/annotation-type';
import { DocumentPage } from '@shared/model';

const ANNOTATIONS_CLASSNAME = 'page__annotations';
const A4_PAGE_RATIO = '210 / 297';

@Component({
  selector: 'app-doc-viewer-page',
  imports: [Toolbar, DraggableDirective, AnnotationView, NgOptimizedImage],
  providers: [DocViewerFacade],
  templateUrl: './doc-viewer.html',
  styleUrls: ['./doc-viewer.scss'],
})
export class DocViewer {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(DocViewerFacade);
  private readonly apiService = inject(ApiService);

  private readonly isEditingAnnotation = signal<boolean>(false);
  private suppressNewPromptAfterEdit = false;

  protected readonly documentId = signal<string>(this.route.snapshot.paramMap.get('id') ?? '1');
  protected readonly pageRatio = signal<string>(A4_PAGE_RATIO);
  protected readonly pages = computed(() =>
    this.facade.pages().map((page) => DocViewer.getPageAdditionalInfo(page)),
  );

  protected readonly documentLoader = resource({
    params: () => ({ id: this.documentId() }),
    loader: ({ params }) => this.apiService.getDocumentById(params.id),
  });

  public constructor() {
    effect(() => {
      if (this.documentLoader.isLoading() || this.documentLoader.error()) {
        return;
      }

      const doc = this.documentLoader.value();

      if (doc) {
        this.facade.initializeDocument(doc.name, doc.pages);
        const firstImageUrl = doc.pages[0]?.imageUrl;

        if (firstImageUrl) {
          void probeImageSize(firstImageUrl).then(({ width, height }) => {
            this.pageRatio.set(`${String(width)} / ${String(height)}`);
          });
        }
      }
    });
  }

  protected onAnnotationEditingChange(editing: boolean): void {
    this.isEditingAnnotation.set(editing);
  }

  protected onAnnotationEvent(id: string, event: AnnotationEvent): void {
    if (event.kind === AnnotationEventKind.DELETE) {
      this.facade.deleteAnnotation(id);
    } else if (event.kind === AnnotationEventKind.UPDATE_CONTENT) {
      this.facade.updateAnnotationContent(id, event.content);
    } else {
      this.onAnnotationEditingChange(event.editing);
    }
  }

  protected onAnnotationRegionMousedown(): void {
    this.suppressNewPromptAfterEdit = this.isEditingAnnotation();
  }

  protected promptNewAnnotationByKey(pageNumber: number, evt: KeyboardEvent): void {
    if (evt.key !== Key.ENTER && evt.key !== Key.SPACE) {
      return;
    }

    if (!(evt.target as HTMLElement).classList.contains(ANNOTATIONS_CLASSNAME)) {
      return;
    }

    evt.preventDefault();
    this.promptNewAnnotation(pageNumber, evt);
  }

  protected promptNewAnnotation(pageNumber: number, evt: Event): void {
    if (this.suppressNewPromptAfterEdit) {
      this.suppressNewPromptAfterEdit = false;
      return;
    }

    if ((evt.target as HTMLElement).classList.contains(ANNOTATIONS_CLASSNAME)) {
      const text = prompt('Введите текст аннотации:');
      if (text?.trim()) {
        this.facade.addTextAnnotation(pageNumber, text.trim());
      }
    }
  }

  protected static getPageAdditionalInfo(page: DocumentPage) {
    return {
      ...page,
      label: `Страница ${page.number.toString()}`,
      imageAlt: `Изображение страницы ${page.number.toString()}`,
      annotationsLabel: `Аннотации к странице ${page.number.toString()}`,
    };
  }
}
