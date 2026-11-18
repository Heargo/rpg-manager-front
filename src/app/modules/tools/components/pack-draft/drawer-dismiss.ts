import {
  DestroyRef,
  Directive,
  inject,
  input,
  output,
  WritableSignal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';

/**
 * Closes a side panel on Escape and on a click on the drawer mask, through the same path as its x button. Listens in the
 * capture phase so the drawer's own Escape handling (which would start hiding its mask) never sees the key. Does nothing
 * while `appDrawerDismiss` is false (panel closed, or a confirmation open: Escape then belongs to the confirmation).
 */
@Directive({ selector: '[appDrawerDismiss]' })
export class DrawerDismissDirective {
  readonly enabled = input(false, { alias: 'appDrawerDismiss' });
  readonly dismiss = output<void>();

  constructor() {
    const document = inject(DOCUMENT);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !this.enabled()) return;
      event.stopPropagation();
      event.preventDefault();
      this.dismiss.emit();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!this.enabled() || !target?.classList?.contains('p-drawer-mask'))
        return;
      this.dismiss.emit();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onClick, true);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('click', onClick, true);
    });
  }
}

/** Asks a confirmation and raises `busy` until it is answered, so Escape does not also close the panel behind it. */
export function confirmWhileBusy(
  service: ConfirmationService,
  busy: WritableSignal<boolean>,
  options: Confirmation,
): void {
  const { accept, reject } = options;
  busy.set(true);
  service.confirm({
    ...options,
    accept: () => {
      busy.set(false);
      accept?.();
    },
    reject: () => {
      busy.set(false);
      reject?.();
    },
  });
}
