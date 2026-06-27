import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Region } from './region';

describe('Region', () => {
  let component: Region;
  let fixture: ComponentFixture<Region>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Region]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Region);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
