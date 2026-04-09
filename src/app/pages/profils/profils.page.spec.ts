import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilsPage } from './profils.page';

describe('ProfilsPage', () => {
  let component: ProfilsPage;
  let fixture: ComponentFixture<ProfilsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfilsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
