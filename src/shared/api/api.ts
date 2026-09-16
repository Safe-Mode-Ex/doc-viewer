import { Service, inject } from '@angular/core';
import { HTTP_TOKEN } from './http-token';
import { Document } from '../model';

@Service()
export class ApiService {
  private readonly http = inject(HTTP_TOKEN);

  /**
   * Возвращает документ по его id
   * не зависимо от того, мок это или реальный запрос.
   */
  public getDocumentById(id: string): Promise<Document> {
    return this.http.get<Document>(`/api/v1/documents/${id}`);
  }
}
