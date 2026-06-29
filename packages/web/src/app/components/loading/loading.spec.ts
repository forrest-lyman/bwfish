import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingService } from '../../services/loading.service';
import { Loading } from './loading';

describe('Loading', () => {
  let component: Loading;
  let fixture: ComponentFixture<Loading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loading],
    }).compileComponents();

    fixture = TestBed.createComponent(Loading);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the loading message', () => {
    const loading = TestBed.inject(LoadingService);
    loading.show('Fetching data…');
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('.loading-message');
    expect(message?.textContent).toContain('Fetching data…');
  });
});
