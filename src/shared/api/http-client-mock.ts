import { Service } from '@angular/core';
import { HttpClient } from './http-token';

const API_FAKE_DELAY = 300;

@Service()
export class HttpClientMockService implements HttpClient {
  /**
   * Реализует api-запрос, имитируя сетевую задержку
   * и возвращая данные из локального JSON файла.
   */
  async get<T>(url: string): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, API_FAKE_DELAY));

    if (url.includes('/documents/')) {
      const mock = await import('./document-mock.json');
      return mock.default as unknown as T;
    }

    throw new Error(`Mock HTTP Client: 404. Enpoint ${url} Not Found`);
  }
}
