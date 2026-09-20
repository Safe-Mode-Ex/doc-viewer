import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HTTP_TOKEN } from '@shared/api';
import { Document } from '@shared/model';
import { DocViewer } from './doc-viewer';

const document: Document = {
  name: 'Test document',
  pages: [{ number: 1, imageUrl: 'assets/page-1.png' }],
};

describe('DocViewer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocViewer],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        { provide: HTTP_TOKEN, useValue: { get: () => Promise.resolve(document) } },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DocViewer);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
