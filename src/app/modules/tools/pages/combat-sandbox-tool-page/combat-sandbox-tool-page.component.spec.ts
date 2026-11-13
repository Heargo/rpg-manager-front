import { TestBed } from '@angular/core/testing';
import { routesTools } from '../../tools.routes';
import { settle } from '../../../../../testing/game-device';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WordListService } from '../../../../core/services/word-list.service';
import en from '../../../../../../public/i18n/generators/en/items.json';
import { CombatSandboxToolPageComponent } from './combat-sandbox-tool-page.component';

/**
 * Contract: the Tools route `tools/combat` loads `CombatSandboxToolPageComponent`. It needs no room: it shows `[data-testid="sandbox-gm"]`
 * (an `app-combat-gm-panel`) and `[data-testid="sandbox-player"]` (an `app-combat-player-view` for the sample character, "Yusica"), and
 * `[data-action="sandbox-start"]` starts an encounter of Yusica against the catalogue enemy "Cave goblin".
 */
describe('CombatSandboxToolPageComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [CombatSandboxToolPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: WordListService,
          useValue: { loadItemWords: async () => en },
        },
      ],
    });
    const fixture = TestBed.createComponent(CombatSandboxToolPageComponent);
    await fixture.whenStable();
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  it('is a Tools route', () => {
    expect(routesTools.map((r) => r.path)).toContain('tools/combat');
  });

  it('shows the GM and the player views without a game', async () => {
    const el = await render();

    expect(el.querySelector('[data-testid="sandbox-gm"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="sandbox-player"]')).not.toBeNull();
  });

  it('starts the sample character against a catalogue enemy, seen from both views', async () => {
    const el = await render();

    (el.querySelector('[data-action="sandbox-start"]') as HTMLElement).click();
    await settle();

    const gm = Array.from(
      el.querySelectorAll<HTMLElement>(
        '[data-testid="sandbox-gm"] [data-testid="combatant"]',
      ),
    ).map((r) => r.dataset['name']);
    expect(gm.sort()).toEqual(['Cave goblin', 'Yusica']);
    const player = Array.from(
      el.querySelectorAll<HTMLElement>(
        '[data-testid="sandbox-player"] [data-testid="order-item"]',
      ),
    ).map((r) => r.dataset['name']);
    expect(player.sort()).toEqual(['Cave goblin', 'Yusica']);
  });
});
