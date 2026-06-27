import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RelatedContent } from './related-content';

describe('RelatedContent', () => {
  let component: RelatedContent;
  let fixture: ComponentFixture<RelatedContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatedContent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatedContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
