import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  Injector,
} from '@angular/core';

/**
 * Starts the player copy at launch, from its own lazy chunk (the initial bundle is tight): the player side compares
 * copies with the host, the host side serves the check and shows the "Pick a save" dialog when there is a conflict.
 */
export async function startPlayerCopy(injector: Injector): Promise<void> {
  const [player, host, pick] = await Promise.all([
    import('./business/player-copy.business'),
    import('./business/player-copy-host.business'),
    import('./components/pick-a-save/pick-a-save.component'),
  ]);
  injector.get(player.PlayerCopyBusiness);
  injector.get(host.PlayerCopyHostBusiness);
  const element = document.body.appendChild(
    document.createElement('app-pick-a-save'),
  );
  const ref = createComponent(pick.PickASaveComponent, {
    environmentInjector: injector.get(EnvironmentInjector),
    hostElement: element,
  });
  injector.get(ApplicationRef).attachView(ref.hostView);
}
