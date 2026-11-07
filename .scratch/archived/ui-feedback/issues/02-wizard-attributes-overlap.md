# World wizard: attributes step overlaps the preview

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Bugs).

At desktop width the base value inputs and delete buttons run under the preview card (`refs/wizard-attributes-overlap.png`). Fix the layout at desktop, tablet and mobile widths.

## Answer

Cause: in `world-new-page.component.scss`, the rule sizing the base-value input (`:host ::ng-deep .number`) was nested inside `.attributes`. It compiled to `.attributes :host …` and never matched, so `p-inputnumber` kept its natural width (about 20 characters), wider than its 6rem grid column, and ran under the preview card. Fix: the rule moved out of the nesting, and `p-inputnumber` got `display: flex; min-width: 0`.

Checked in the browser (no unit test: CSS-only, decided with the user): at 1280 px, 768 px and 375 px, the name, value and delete button stay inside the form column (row right edge 649 px, preview left edge 673 px at desktop), with no horizontal scroll.
