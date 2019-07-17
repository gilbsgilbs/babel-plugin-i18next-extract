import * as BabelTypes from '@babel/types';

import i18next from 'i18next';
import { Config } from './config';

interface I18NextParsedOptions {
  // If contexts is an array, it's an explicit list of context.
  // If contexts is true, default context should be used.
  // If contexts is false, context are disable.
  contexts: string[] | boolean;
  hasCount: boolean;
  ns: string | null;
  defaultValue: string | null;
}

/**
 * Key as extracted by an extractor.
 */
export interface ExtractedKey {
  key: string;
  parsedOptions: I18NextParsedOptions;

  // Nodes (not node paths) from which the key was extracted.
  // First item is the node being traversed by the main visitor.
  // Other items are the nodes involved in the extraction (e.g. `t()`
  // CallExpression).
  // This helps keeping track of which nodes were already extracted by an
  // extractor.
  sourceNodes: BabelTypes.Node[];
  // Name of the extractor that extracted the key. e.g. extractTransComponent
  extractorName: string;
}

/**
 * Extracted key with enriched information.
 */
export interface TranslationKey extends ExtractedKey {
  cleanKey: string; // Key without namespace or path.
  keyPath: string[]; // for instance, if key is "foo.bar.baz", keyPath would be ["foo", "bar"].
  ns: string;
  isDerivedKey: boolean;
}

/**
 * Parse namespace and key path from an extracted key.
 * @param key: key to parse
 * @param config: plugin configuration
 */
function parseExtractedKey(key: ExtractedKey, config: Config): TranslationKey {
  let cleanKey = key.key;

  let ns: string = key.parsedOptions.ns || config.defaultNS;
  if (config.nsSeparator) {
    const nsSeparatorPos = cleanKey.indexOf(config.nsSeparator);

    if (nsSeparatorPos !== -1) {
      ns = cleanKey.slice(0, nsSeparatorPos);
      cleanKey = cleanKey.slice(nsSeparatorPos + 1);
    }
  }

  let keyPath = Array<string>();
  if (config.keySeparator) {
    const fullPath = cleanKey.split(config.keySeparator);
    keyPath = fullPath.slice(0, fullPath.length - 1);
    cleanKey = fullPath[fullPath.length - 1];
  }

  return {
    ...key,
    cleanKey,
    keyPath,
    ns,
    isDerivedKey: false,
  };
}

/**
 * Compute all derived keys for a local from a key and parsed i18next options.
 *
 * e.g.
 *   ({'foo', {contexts: false, hasCount: true}}, 'en')
 *     => ['foo', 'foo_plural']
 *   ({'bar', {contexts: ['male', 'female'], hasCount: true}}, 'en')
 *     => ['foo_male', 'foo_male_plural', 'foo_female', 'foo_female_plural']
 *
 * @param extractedKey key that was extracted with an extractor.
 * @param locale locale code
 * @returns All derived keys that could be found from TranslationKey for
 *   locale.
 */
export function computeDerivedKeys(
  extractedKey: ExtractedKey,
  locale: string,
  config: Config,
): TranslationKey[] {
  const translationKey = parseExtractedKey(extractedKey, config);
  const { parsedOptions, cleanKey: key } = translationKey;
  let keys = [translationKey];

  if (parsedOptions.contexts !== false) {
    // Add all context suffixes
    // For instance, if key is "foo", may want
    // ["foo", "foo_male", "foo_female"] depending on defaultContexts value.
    const contexts = Array.isArray(parsedOptions.contexts)
      ? parsedOptions.contexts
      : config.defaultContexts;
    keys = contexts.map(v => {
      if (v === '') return translationKey;
      return {
        ...translationKey,
        cleanKey: key + config.contextSeparator + v,
        isDerivedKey: true,
      };
    });
  }

  if (parsedOptions.hasCount) {
    // See https://www.i18next.com/translation-function/plurals#how-to-find-the-correct-plural-suffix
    const pluralRule = i18next.services.pluralResolver.getRule(locale);
    const numberOfPlurals = pluralRule.numbers.length;

    if (numberOfPlurals === 1) {
      keys = keys.map(k => ({
        ...k,
        cleanKey: k.cleanKey + config.pluralSeparator + '0',
        isDerivedKey: true,
      }));
    } else if (numberOfPlurals === 2) {
      keys = keys.reduce(
        (accumulator, k) => [
          ...accumulator,
          k,
          {
            ...k,
            cleanKey: k.cleanKey + config.pluralSeparator + 'plural',
            isDerivedKey: true,
          },
        ],
        Array<TranslationKey>(),
      );
    } else {
      keys = keys.reduce(
        (accumulator, k) => [
          ...accumulator,
          ...Array(numberOfPlurals)
            .fill(null)
            .map((_, idx) => ({
              ...k,
              cleanKey: k.cleanKey + config.pluralSeparator + idx,
              isDerivedKey: true,
            })),
        ],
        Array<TranslationKey>(),
      );
    }
  }

  return keys;
}
