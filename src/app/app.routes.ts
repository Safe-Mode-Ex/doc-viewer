import { Routes } from '@angular/router';
import { DocViewerPage } from '@pages/doc-viewer';

export const routes: Routes = [
  { path: 'viewer/view/:id', component: DocViewerPage },
  { path: '**', redirectTo: 'viewer/view/1' },
];
