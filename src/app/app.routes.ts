import { Routes } from '@angular/router';
import { DocViewer } from '@pages/doc-viewer';

export const routes: Routes = [
  { path: 'viewer/view/:id', component: DocViewer },
  { path: '**', redirectTo: 'viewer/view/1' },
];
