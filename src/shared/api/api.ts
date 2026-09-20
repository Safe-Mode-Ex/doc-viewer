import { Service, inject } from '@angular/core';
import { HTTP_TOKEN } from './http-token';
import { Document } from '../model';

/**
 * Сервис доступа к данным документа.
 *
 * Скрывает конкретную реализацию HTTP-клиента (мок или реальный запрос),
 * поэтому потребители не знают, откуда фактически берутся данные.
 */
@Service()
export class ApiService {
  private readonly http = inject(HTTP_TOKEN);

  /**
   * Возвращает документ по его id,
   * независимо от того, мок это или реальный запрос.
   */
  public getDocumentById(id: string): Promise<Document> {
    return this.http.get<Document>(`/api/v1/documents/${id}`);
  }
}
