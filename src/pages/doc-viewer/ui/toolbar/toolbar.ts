import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.scss'],
})
export class Toolbar {
  public documentName = input.required<string | null>();
  public zoom = input.required<number>();

  protected zoomIn = output();
  protected zoomOut = output();
  protected save = output();
}
