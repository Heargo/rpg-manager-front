/** Routes and topics are `<feature>/<action>`: lowercase words with dashes, e.g. `character/spend-stat-point`. */
const ROUTE_PATTERN = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

export function isValidRoute(value: unknown): value is string {
  return typeof value === 'string' && ROUTE_PATTERN.test(value);
}

export function assertValidRoute(route: string): void {
  if (!isValidRoute(route)) throw new Error(`Invalid route "${route}": use <feature>/<action>`);
}
