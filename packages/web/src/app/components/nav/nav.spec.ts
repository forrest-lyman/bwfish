import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Nav } from './nav';
import { NavService } from '../../services/nav.service';

const navServiceMock = {
  nodes: () => [],
  loaded: () => true,
  error: () => null,
  load: jasmine.createSpy('load').and.resolveTo(),
  toggle: jasmine.createSpy('toggle'),
};

describe('Nav', () => {
  let component: Nav;
  let fixture: ComponentFixture<Nav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nav],
      providers: [
        provideRouter([]),
        { provide: NavService, useValue: navServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Nav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to region scope', () => {
    expect(component.scope()).toBe('region');
  });
});
