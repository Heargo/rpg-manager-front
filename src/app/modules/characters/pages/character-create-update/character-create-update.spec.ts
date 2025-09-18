import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharacterCreateUpdate } from './character-create-update';

describe('CharacterCreateUpdate', () => {
  let component: CharacterCreateUpdate;
  let fixture: ComponentFixture<CharacterCreateUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCreateUpdate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CharacterCreateUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
