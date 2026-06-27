import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { Profile } from './profile';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { RegionService } from '../../services/region.service';
import { PortService } from '../../services/port.service';

const authServiceMock = {
  user: signal(null),
  ready: signal(true),
};

const userServiceMock = {
  profile: signal(null),
};

const regionServiceMock = {
  getAll: jasmine.createSpy('getAll').and.resolveTo([]),
};

const portServiceMock = {
  getByRegion: jasmine.createSpy('getByRegion').and.resolveTo([]),
};

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: RegionService, useValue: regionServiceMock },
        { provide: PortService, useValue: portServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
