/** How long after a press its click and its synthetic hover events still belong to it. */
const PRESS_MEMORY_MS = 1000;

export interface PointerKind {
  /** Bind to `pointerdown`: the one event whose `pointerType` every browser gets right. */
  down(event: Event): void;
  /** A hover from a real mouse (not the fake one iOS sends around a tap). */
  isMouseHover(event: Event): boolean;
  /** A click from a real mouse; false for a tap, a pen or the keyboard. */
  isMouseClick(event: Event): boolean;
}

/**
 * Tells a mouse from a finger for hover-or-tap widgets. Safari on iOS (18.2+) reports the click of a tap, and
 * sometimes a `pointerenter` around it, as `pointerType: "mouse"` (WebKit bug 282988); its `pointerdown` says "touch".
 * So the click takes the type of the press that started it, and a "mouse" hover right after a touch press is ignored.
 */
export function createPointerKind(now: () => number = () => Date.now()): PointerKind {
  let lastType: string | undefined;
  let lastAt = -Infinity;
  const recent = () => now() - lastAt <= PRESS_MEMORY_MS;
  const typeOf = (event: Event) => (event as PointerEvent).pointerType || undefined;
  return {
    down(event) {
      lastType = typeOf(event);
      lastAt = now();
    },
    isMouseHover(event) {
      if (typeOf(event) !== 'mouse') return false;
      return !(recent() && lastType !== 'mouse');
    },
    isMouseClick(event) {
      return (recent() ? lastType : typeOf(event)) === 'mouse';
    },
  };
}
