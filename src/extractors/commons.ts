export class ExtractionError extends Error {}

/**
 * Given a value, if the value is an array, return the first
 * item of the array. Otherwise, return the value.
 *
 * This is mainly useful to parse namespaces which can be strings
 * as well as array of strings.
 */
export function getFirstOrNull<T>(val: T | null | T[]): T | null {
  if (Array.isArray(val)) val = val[0];
  return val === undefined ? null : val;
}
