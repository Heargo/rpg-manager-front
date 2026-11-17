/** Lets pending animation frames and timers run (a closing overlay waits for a frame before it leaves the document). */
export async function flushFrames(count = 3): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => setTimeout(resolve));
  }
}

/**
 * Opens a `p-select` through its host element, clicks its `index`-th option and waits until the overlay is gone,
 * so the next select starts from a clean document. Options are read from the newest overlay only.
 */
export async function chooseSelectOption(
  select: HTMLElement,
  index: number,
  settle: () => Promise<void>,
): Promise<void> {
  select.click();
  await settle();
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('.p-select-overlay'));
  const overlay = overlays.at(-1);
  const options = Array.from((overlay ?? document).querySelectorAll<HTMLElement>('li[role="option"]'));
  options[index].click();
  await settle();
  for (let i = 0; i < 10 && document.querySelector('.p-select-overlay'); i++) {
    await flushFrames(1);
    await settle();
  }
}
