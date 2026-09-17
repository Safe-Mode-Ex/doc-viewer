import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.scss'],
})
export class ToolbarComponent {
  protected documentName = input.required<string | null>();
  protected zoom = input.required<number>();

  protected zoomIn = output();
  protected zoomOut = output();
  protected save = output();
}
