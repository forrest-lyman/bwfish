import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Spot } from './spot';

describe('Spot', () => {
  let component: Spot;
  let fixture: ComponentFixture<Spot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Spot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
