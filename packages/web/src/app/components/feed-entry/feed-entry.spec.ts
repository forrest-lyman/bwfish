import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedEntry } from './feed-entry';

describe('FeedEntry', () => {
  let component: FeedEntry;
  let fixture: ComponentFixture<FeedEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedEntry],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedEntry);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('item', {
      entry: {
        id: '1',
        type: 'question',
        text: 'How is the bar?',
        collection: 'ports',
        refId: 'port-1',
        createdBy: 'user-1',
        createdAt: '2026-06-27T12:00:00.000Z',
        lastModified: '2026-06-27T12:00:00.000Z',
        score: 0,
      },
      displayName: 'Angler',
      initials: 'A',
      score: 0,
      userVote: null,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
