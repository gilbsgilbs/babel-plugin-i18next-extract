import { Config } from '../config';
import { TranslationKey } from '../keys';

/**
 * Generic class thrown by exporters in case of error.
 */
export class ExportError extends Error {}

/**
 * Thrown by exporters when an existing value in a translation
 * file is incompatible with the value we're trying to set.
 *
 * For instance, if the translation file contains a deep key named `foo.bar`
 * but we extracted a (not deep) `foo` key, this error may be thrown.
 */
export class ConflictError extends ExportError {}

/**
 * Interface implented by exporters.
 */
export interface Exporter<F, K> {
  /**
   * Initialize a new, empty translation file.
   */
  init: (params: { config: Config }) => F;
  /**
   * Parse a translation file givent its content.
   */
  parse: (params: { config: Config; content: string }) => F;
  /**
   * Serialize the translation file before saving it.
   */
  stringify: (params: { config: Config; file: F }) => string;
  /**
   * Get a key given a translation file.
   */
  getKey: (params: {
    config: Config;
    file: F;
    keyPath: string[];
    cleanKey: string;
  }) => K | undefined;
  /**
   * Add a key to a translation file.
   */
  addKey: (params: {
    config: Config;
    file: F;
    key: TranslationKey;
    value: K;
  }) => F;
}
