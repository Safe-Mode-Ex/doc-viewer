import { Service, computed, signal } from '@angular/core';
import { Annotation, DocumentPage, ViewerState } from '@shared/model';

const INITIAL_STATE: ViewerState = {
  documentName: null,
  pages: [],
  zoom: 100,
  annotations: [],
};

@Service()
export class DocViewerFacade {
  private readonly state = signal<ViewerState>(INITIAL_STATE);

  public readonly documentName = computed(() => this.state().documentName);
  public readonly pages = computed(() => this.state().pages);
  public readonly zoom = computed(() => this.state().zoom);
  public readonly annotations = computed(() => this.state().annotations);

  public initializeDocument(name: string, pages: DocumentPage[]): void {
    this.state.update((current) => ({
      ...current,
      documentName: name,
      pages,
      annotations: [],
    }));
  }

  public zoomIn(): void {
    this.state.update((current) => ({
      ...current,
      zoom: Math.min(200, current.zoom + 10),
    }));
  }

  public zoomOut(): void {
    this.state.update((current) => ({
      ...current,
      zoom: Math.max(50, current.zoom - 10),
    }));
  }

  public addTextAnnotation(pageNumber: number, content: string): void {
    const newAnnotation: Annotation = {
      id: `ann_${crypto.randomUUID()}`,
      pageNumber,
      type: 'text',
      x: 35,
      y: 20,
      content,
    };

    this.state.update((current) => ({
      ...current,
      annotations: [...current.annotations, newAnnotation],
    }));
  }

  public updateAnnotationPosition(id: string, xPercent: number, yPercent: number): void {
    this.state.update((current) => ({
      ...current,
      annotations: current.annotations.map((ann) =>
        ann.id === id ? { ...ann, x: xPercent, y: yPercent } : ann,
      ),
    }));
  }

  public updateAnnotationContent(id: string, newContent: string): void {
    this.state.update((current) => ({
      ...current,
      annotations: current.annotations.map((ann) =>
        ann.id === id ? { ...ann, content: newContent } : ann,
      ),
    }));
  }

  public deleteAnnotation(id: string): void {
    this.state.update((current) => ({
      ...current,
      annotations: current.annotations.filter((ann) => ann.id !== id),
    }));
  }

  public saveAndExport(): void {
    const currentState = this.state();
    const outputData = {
      documentName: currentState.documentName,
      totalAnnotations: currentState.annotations.length,
      exportedAt: new Date().toISOString(),
      annotations: currentState.annotations,
    };

    console.log('=== ЭКСПОРТ ДОКУМЕНТА С АННОТАЦИЯМИ ===');
    console.log(JSON.stringify(outputData, null, 2));
  }
}
