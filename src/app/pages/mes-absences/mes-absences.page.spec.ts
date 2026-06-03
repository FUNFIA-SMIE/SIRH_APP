import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MesAbsencesPage } from './mes-absences.page';

describe('MesAbsencesPage', () => {
  let component: MesAbsencesPage;
  let fixture: ComponentFixture<MesAbsencesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MesAbsencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
