export interface DocumentPage {
  number: number;
  imageUrl: string;
}

export interface Document {
  name: string;
  pages: DocumentPage[];
}

export interface Annotation {
  id: string;
  pageNumber: number;
  type: string;
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
