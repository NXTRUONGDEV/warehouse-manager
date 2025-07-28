import { TestBed } from '@angular/core/testing';

import { ThongKeService } from './thong-ke.service';

describe('ThongKeService', () => {
  let service: ThongKeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThongKeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
