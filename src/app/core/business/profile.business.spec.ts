import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../testing/test-providers';
import { ProfileStorageService } from '../services/profile-storage.service';
import { ProfileBusiness } from './profile.business';

describe('ProfileBusiness', () => {
  let stored: string | null;
  let storage: { read: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; newPlayerId: ReturnType<typeof vi.fn> };

  function create(): ProfileBusiness {
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: ProfileStorageService, useValue: storage }],
    });
    return TestBed.inject(ProfileBusiness);
  }

  beforeEach(() => {
    stored = null;
    storage = {
      read: vi.fn(() => stored),
      write: vi.fn((value: string) => {
        stored = value;
        return true;
      }),
      newPlayerId: vi.fn(() => 'abcd-1234-ef'),
    };
  });

  it('creates and saves a profile on first launch', () => {
    const business = create();

    expect(business.$profile()).toEqual({ playerId: 'abcd-1234-ef', name: 'Adventurer abcd' });
    expect(JSON.parse(stored!)).toEqual(business.$profile());
  });

  it('loads the stored profile and keeps its id', () => {
    stored = JSON.stringify({ playerId: 'p1', name: 'Ada' });

    const business = create();

    expect(business.$profile()).toEqual({ playerId: 'p1', name: 'Ada' });
    expect(storage.newPlayerId).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('replaces a corrupt stored profile with a new one', () => {
    stored = '{broken';

    const business = create();

    expect(business.$profile().playerId).toBe('abcd-1234-ef');
  });

  it('renames, normalizing and saving the name', () => {
    stored = JSON.stringify({ playerId: 'p1', name: 'Ada' });
    const business = create();

    expect(business.rename('  zoé   la brave ')).toBe(true);

    expect(business.$profile()).toEqual({ playerId: 'p1', name: 'zoé la brave' });
    expect(business.$initial()).toBe('Z');
    expect(JSON.parse(stored!)).toEqual({ playerId: 'p1', name: 'zoé la brave' });
  });

  it('refuses a blank name and keeps the old one', () => {
    stored = JSON.stringify({ playerId: 'p1', name: 'Ada' });
    const business = create();

    expect(business.rename('   ')).toBe(false);

    expect(business.$profile().name).toBe('Ada');
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('never uses an untranslated key as the default name', () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations({ preloadLangs: false, langs: {} }),
        { provide: ProfileStorageService, useValue: storage },
      ],
    });
    const business = TestBed.inject(ProfileBusiness);
    expect(business.$profile().name).toBe('Adventurer abcd');
  });
});
