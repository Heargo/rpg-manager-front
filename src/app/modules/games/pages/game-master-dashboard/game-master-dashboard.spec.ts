import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameMasterDashboard } from './game-master-dashboard';

describe('GameMasterDashboard', () => {
  let component: GameMasterDashboard;
  let fixture: ComponentFixture<GameMasterDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameMasterDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameMasterDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
