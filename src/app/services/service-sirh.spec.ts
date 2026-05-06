import { TestBed } from '@angular/core/testing';

import { ServiceSirh } from './service-sirh';

describe('ServiceSirh', () => {
  let service: ServiceSirh;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceSirh);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
