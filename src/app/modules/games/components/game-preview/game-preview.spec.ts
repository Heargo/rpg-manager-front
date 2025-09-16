import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamePreview } from './game-preview';

describe('GamePreview', () => {
  let component: GamePreview;
  let fixture: ComponentFixture<GamePreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamePreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GamePreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
