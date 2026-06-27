import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Technique } from './technique';

describe('Technique', () => {
  let component: Technique;
  let fixture: ComponentFixture<Technique>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Technique]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Technique);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
