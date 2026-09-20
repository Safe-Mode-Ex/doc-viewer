## Запуск проекта

Переменные окружения: отсутствуют. В репозитории нет файлов `.env*` и каталога `src/environments`; `HTTP_TOKEN` в `src/app/app.config.ts:16-19` всегда связан с `HttpClientMockService`.

Зависимости: `package.json` фиксирует `packageManager: npm@11.19.0`; `dependencies`: `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/router` версии `^22.1.0`, `rxjs ~7.8.0`, `tslib ^2.3.0`; `devDependencies`: `@angular/build ^22.1.8`, `@angular/cli ^22.1.8`, `typescript ~6.0.2`, `vitest ^4.0.8`. Проверено на `node v24.21.0` и `npm 11.19.0`.

Установка:

```bash
npm ci
```

Dev-сервер (`package.json:6` — `start: ng serve`, `angular.json:59-70` — builder `@angular/build:dev-server`, `defaultConfiguration: development`):

```bash
npm start
```

Адрес по умолчанию: `http://localhost:4200/`. Маршруты заданы в `src/app/app.routes.ts:4-7`: `viewer/view/:id` открывает компонент `DocViewer`, `**` перенаправляет на `viewer/view/1`.

Прочие команды: `npm run build` (`ng build`, артефакты в `dist/`), `npm test` (`ng test`, раннер Vitest), `npm run lint` (`ng lint`, шаблоны `src/**/*.ts`, `src/**/*.html` из `angular.json:74-79`).

## Архитектура интеграции

1. `src/pages/doc-viewer/ui/doc-viewer.ts:28` — `documentId` читается один раз из `ActivatedRoute.snapshot.paramMap.get('id')`, значение по умолчанию `'1'`.
2. `src/pages/doc-viewer/ui/doc-viewer.ts:39-42` — `resource documentLoader` вызывает `ApiService.getDocumentById(params.id)` при изменении `documentId`.
3. `src/shared/api/api.ts:19-21` — `ApiService.getDocumentById(id)` выполняет `http.get<Document>('/api/v1/documents/${id}')`, где `http` получен через `inject(HTTP_TOKEN)`.
4. `src/app/app.config.ts:16-19` — `HTTP_TOKEN` связан с `HttpClientMockService`; реального HTTP-клиента в провайдерах нет.
5. `src/shared/api/http-client-mock.ts:4,17-25` — `HttpClientMockService.get` ждет `API_FAKE_DELAY = 300` мс, затем при `url.includes('/documents/')` делает динамический `import('./document-mock.json')` и возвращает его; иначе выбрасывает `Error('Mock HTTP Client: 404. Enpoint ... Not Found')`.
6. `src/pages/doc-viewer/ui/doc-viewer.ts:44-62` — `effect` при `isLoading() == false` и отсутствии `error()` вызывает `DocViewerFacade.initializeDocument(doc.name, doc.pages)` и `probeImageSize(doc.pages[0].imageUrl)` для установки `pageRatio` (начальное значение `'210 / 297'` из `src/pages/doc-viewer/ui/doc-viewer.ts:11,29`).
7. `src/pages/doc-viewer/model/doc-viewer-facade.ts:12-18,20-27` — `DocViewerFacade` хранит `ViewerState` (`documentName: null`, `pages: []`, `zoom: 100`, `annotations: []`) в `signal` и отдает `computed` `documentName`, `pages`, `zoom`, `annotations`; `initializeDocument` записывает `name` и `pages` и очищает `annotations`.
8. `src/pages/doc-viewer/ui/doc-viewer.ts:30-37` и `src/pages/doc-viewer/ui/doc-viewer.html:1-67` — компонент маппит страницы в `label`, `imageAlt`, `annotationsLabel` и рендерит `Toolbar` (`documentName`, `zoom`, события `zoomIn`/`zoomOut`/`save`), `img [ngSrc]` с `fill` и `sizes="100vw"`, список аннотаций через `@defer (when facade.annotations().length > 0; prefetch on idle)` с фильтром `annotation.pageNumber === page.number`.

## Внешние зависимости с лимитами

- Сетевой бэкенд: отсутствует. Данные документа — локальный `src/shared/api/document-mock.json` (`name: "test doc"`, 5 записей `pages` с `imageUrl: "/pages/1.png"` … `"/pages/5.png"`). Изображения страниц — локальные `public/pages/1.png` (132 КБ), `2.png` (72 КБ), `3.png` (76 КБ), `4.png` (72 КБ), `5.png` (72 КБ).
- Искусственная задержка мока: `API_FAKE_DELAY = 300` мс в `src/shared/api/http-client-mock.ts:4`.
- `IMAGE_LOADER` в `src/app/app.config.ts:21-24` — тождественная функция `(config) => config.src`, оптимизации и CDN нет.
- Бюджеты сборки `angular.json:37-47` (`configuration: production`): `initial`: `maximumWarning: "500kB"`, `maximumError: "1MB"`; `anyComponentStyle`: `maximumWarning: "4kB"`, `maximumError: "8kB"`.
- Диапазон масштаба `src/pages/doc-viewer/model/doc-viewer-facade.ts:29-41`: `zoomIn` — `Math.min(200, zoom + 10)`, `zoomOut` — `Math.max(50, zoom - 10)`; ширина `.document__container` в `doc-viewer.html:18` равна `facade.zoom()` в процентах.
- Браузерные API, используемые напрямую: `window.prompt` (`doc-viewer.ts:93`), `crypto.randomUUID` (`doc-viewer-facade.ts:46`), конструктор `Image` (`src/shared/lib/image-size/image-size.ts:15`).
- Пакетный менеджер и рантайм: установка через `npm ci` по `package-lock.json`; `npm@11.19.0` указан в поле `packageManager`.

## Известные ограничения

- Параметр `:id` не влияет на содержимое: `HttpClientMockService` возвращает один и тот же `document-mock.json` для любого URL, содержащего `/documents/`; ветка `404` достигается только для URL без этой подстроки (`http-client-mock.ts:20-25`).
- `documentId` читается только из `route.snapshot` (`doc-viewer.ts:28`): изменение `:id` без пересоздания компонента не запускает повторную загрузку.
- Аннотации хранятся только в `signal` фасада: `initializeDocument` сбрасывает их в `[]` (`doc-viewer-facade.ts:20-27`), перезагрузка страницы удаляет все аннотации.
- `saveAndExport` (`doc-viewer-facade.ts:84-95`) только печатает JSON (`documentName`, `totalAnnotations`, `exportedAt`, `annotations`) в `console.log`; записи на сервер или в файл нет.
- Новая аннотация всегда создается с `type: 'text'`, `x: 35`, `y: 20` и `id: 'ann_${crypto.randomUUID()}'` (`doc-viewer-facade.ts:43-51`); в окружении без `crypto.randomUUID` создание падает.
- `probeImageSize` (`image-size.ts:13-25`) не имеет таймаута и кэша; при `onerror` промис отклоняется с `Error('Failed to load image: ...')`, `pageRatio` остается `'210 / 297'`.
- Создание аннотации использует блокирующий `prompt('Введите текст аннотации:')` (`doc-viewer.ts:93`); отмена (`null`) и строка из одних пробелов не создают аннотацию (`doc-viewer.ts:94`).
- Удаление пустого ввода при редактировании запрещено: `TextAnnotation.saveEdit` (`text-annotation.ts:45-56`) не эмитит `updateContent`, если `trimmed` пуст или равен текущему `content`.
- Клавиатурное создание работает только для `Enter`/`Space` на элементе с классом `page__annotations` (`doc-viewer.ts:73-84`); клик вне этого `div` проверкой `classList.contains('page__annotations')` игнорируется (`doc-viewer.ts:92`).
