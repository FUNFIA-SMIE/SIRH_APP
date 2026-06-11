import { TestBed } from '@angular/core/testing';

import { PointageServices } from './pointage-services';

describe('PointageServices', () => {
  let service: PointageServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointageServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
