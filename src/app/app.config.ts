import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { provideRouter } from '@angular/router';
import { HttpClientMockService, HTTP_TOKEN } from '@shared/api';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    {
      provide: HTTP_TOKEN,
      useClass: HttpClientMockService,
    },
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => config.src,
    },
  ],
};
