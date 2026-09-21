export interface DocumentPage {
  number: number;
  imageUrl: string;
}

export interface Document {
  name: string;
  pages: DocumentPage[];
}

/**
 * Известные типы аннотаций. Намеренная первая ступень точки расширения:
 * реестр компонентов и fallback для неизвестных типов — ui/annotation/annotation-registry.ts.
 */
export type AnnotationType = 'text';

export interface Annotation {
  id: string;
  pageNumber: number;
  type: AnnotationType;
  x: number;
  y: number;
  content: string;
}

export interface ViewerState {
  documentName: string | null;
  pages: DocumentPage[];
  zoom: number;
  annotations: Annotation[];
}
