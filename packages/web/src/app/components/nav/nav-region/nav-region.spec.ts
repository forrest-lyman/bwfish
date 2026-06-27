import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavRegion } from './nav-region';
import { NavService } from '../../../services/nav.service';

const navServiceMock = {
  nodes: () => [],
  loaded: () => true,
  error: () => null,
  load: jasmine.createSpy('load').and.resolveTo(),
  toggle: jasmine.createSpy('toggle'),
};

describe('NavRegion', () => {
  let component: NavRegion;
  let fixture: ComponentFixture<NavRegion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavRegion],
      providers: [
        provideRouter([]),
        { provide: NavService, useValue: navServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavRegion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads nav data on init', () => {
    expect(navServiceMock.load).toHaveBeenCalled();
  });
});
