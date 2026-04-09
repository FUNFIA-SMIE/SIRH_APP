import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemandeCongePage } from './demande-conge.page';

describe('DemandeCongePage', () => {
  let component: DemandeCongePage;
  let fixture: ComponentFixture<DemandeCongePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DemandeCongePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
