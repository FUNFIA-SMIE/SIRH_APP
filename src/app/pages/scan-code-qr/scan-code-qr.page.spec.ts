import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScanCodeQRPage } from './scan-code-qr.page';

describe('ScanCodeQRPage', () => {
  let component: ScanCodeQRPage;
  let fixture: ComponentFixture<ScanCodeQRPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanCodeQRPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
