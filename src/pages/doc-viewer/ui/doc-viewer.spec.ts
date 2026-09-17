import { TestBed } from '@angular/core/testing';
import { DocViewer } from './doc-viewer';

describe('DocViewer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocViewer],
    })
      .compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DocViewer);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
