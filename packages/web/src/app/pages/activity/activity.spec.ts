import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Activity } from './activity';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';

const authServiceMock = {
  user: signal(null),
  ready: signal(true),
};

const feedServiceMock = {
  pullByUser: jasmine.createSpy('pullByUser').and.resolveTo([]),
};

describe('Activity', () => {
  let component: Activity;
  let fixture: ComponentFixture<Activity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Activity],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FeedService, useValue: feedServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Activity);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
