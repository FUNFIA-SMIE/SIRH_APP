import { TestBed } from '@angular/core/testing';

import { ServicesPdf } from './services-pdf';

describe('ServicesPdf', () => {
  let service: ServicesPdf;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicesPdf);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
