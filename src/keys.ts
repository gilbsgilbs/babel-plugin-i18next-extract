import * as BabelTypes from '@babel/types';
import * as i18next from 'i18next';

import { Config } from './config';

interface I18NextParsedOptions {
  // If contexts is an array, it's an explicit list of context.
  // If contexts is true, default context should be used.
  // If contexts is false, context are disable.
  contexts: string[] | boolean;
  hasCount: boolean;
  ns: string | null;
  keyPrefix: string | null;
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

  const keyPrefix = key.parsedOptions.keyPrefix;
  if (keyPrefix) {
    // Imitate behavior of i18next and just connect prefix with key before any other action
    const keySeparator = config.keySeparator || '.';
    cleanKey = `${keyPrefix}${keySeparator}${cleanKey}`;
  }

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
    keyPath = [...keyPath, ...fullPath.slice(0, fullPath.length - 1)];
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
 * FIXME: some of the work of this function should be delegated to the exporter.
 * This function should just put derivation metadata (each plural for the current
 * locale and each context) into an attribute of the key. The exporter should then
 * produce the actual value of the key using the metadata from the TranslationKey.
 * This would remove the need to specify JSONvX-specific code into this
 * function, but it will be easier to do when we drop support for JSONv3.
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
    keys = contexts.map((v) => {
      if (v === '') return translationKey;
      return {
        ...translationKey,
        cleanKey: key + config.contextSeparator + v,
        isDerivedKey: true,
      };
    });
  }

  if (parsedOptions.hasCount) {
    const i18n = i18next.createInstance({
      pluralSeparator: config.pluralSeparator,
      // i18next doesn't allow passing "v4" as it's not "compat" mode.
      compatibilityJSON: config.compatibilityJSON === 'v3' ? 'v3' : undefined,
    });
    // We need to init the i18n instance to have all the services initialized.
    i18n.init();

    const unknownLocaleError = new Error(`Unknown locale '${locale}'.`);
    let pluralCategories: string[];

    // See https://www.i18next.com/translation-function/plurals#how-to-find-the-correct-plural-suffix

    // - i18next v21+ w/ JSONv4+: Intl.PluralRules is *always* returned even
    //   if the locale is unknown.
    // - JSONv3- (independently of i18next version): some custom untyped object
    //   is returned, or undefined if the local is unknown.
    const pluralRule:
      | Intl.PluralRules
      | { numbers: Array<number> }
      | undefined = i18n.services.pluralResolver.getRule(
      locale,
      // TODO: a comment hint should allow to override cardinality/ordinality.
      // It defaults to cardinal, but this is not correct.
      { ordinal: false },
    );
    if (pluralRule === undefined) {
      throw unknownLocaleError;
    } else if (pluralRule instanceof Intl.PluralRules) {
      const pluralRulesOptions = pluralRule.resolvedOptions();
      // Node only returns the language part of the BCP 47 tag when resolving
      // plural rules. We still need to check if the locale was properly
      // resolved, but runtimes silently fallback to the user's locale when
      // specifying a locale they don't know. Also, there doesn't seem to be a
      // way to tell if a given locale is supported by the runtime or not. So
      // as a workaround, we ensure that at least the language part of the
      // resolved locale is consistent with the locale we want.
      if (!locale.startsWith(pluralRulesOptions.locale)) {
        throw unknownLocaleError;
      }
      pluralCategories = pluralRulesOptions.pluralCategories;
    } else {
      const pluralsCount = pluralRule.numbers.length;
      if (pluralsCount === 2) {
        pluralCategories = ['', 'plural'];
      } else {
        pluralCategories = Array(pluralsCount)
          .fill(null)
          .map((_, idx) => idx.toString());
      }
    }

    if (config.enableExperimentalIcu) {
      if (config.compatibilityJSON === 'v3') {
        throw new Error('ICU format is only supported with JSONv4.');
      }

      const icuPlurals = pluralCategories
        .map(
          (numAsText: string) =>
            `${numAsText} {${icuPluralValue(
              extractedKey.parsedOptions.defaultValue,
            )}}`,
        )
        .join(' ');

      extractedKey.parsedOptions.defaultValue = `{count, plural, ${icuPlurals}}`;
    } else {
      const pluralSuffixes = pluralCategories.map((cat) =>
        cat.length === 0 ? '' : config.pluralSeparator + cat,
      );
      keys = keys.reduce(
        (accumulator, k) => [
          ...accumulator,
          ...pluralSuffixes.map((suffix) => ({
            ...k,
            cleanKey: k.cleanKey + suffix,
            // Let's not consider singular a derived key. This is useful if one
            // want to use default values for singular.
            isDerivedKey:
              k.isDerivedKey ||
              !['', `${config.pluralSeparator}_one`].includes(suffix),
          })),
        ],
        Array<TranslationKey>(),
      );
    }
  }

  return keys;
}

function icuPluralValue(defaultValue: string | null): string {
  const oldVal = defaultValue ?? '';
  const withIcuSingleCurlyBrace = oldVal
    .replace(/{{/g, '{')
    .replace(/}}/g, '}');
  return withIcuSingleCurlyBrace;
}
