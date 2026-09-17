import { InjectionToken } from '@angular/core';

export interface HttpClient {
  get<T>(url: string): Promise<T>;
}

export const HTTP_TOKEN = new InjectionToken<HttpClient>('HTTP_TOKEN');
