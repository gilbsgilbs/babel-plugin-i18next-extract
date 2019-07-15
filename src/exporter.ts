import fs from 'fs';
import path from 'path';
import stringify from 'json-stable-stringify';

import { TranslationKey } from './keys';
import { Config } from './config';
import { PLUGIN_NAME } from './constants';

/**
 * Thrown when an error happens during the translations export.
 */
export class ExportError extends Error {}

/**
 * A deep, recursive object which leaves must be of generic type V.
 */
interface DeepObject<V = string> {
  [k: string]: DeepObject<V> | V;
}

/**
 * Content of a translation file. Just a deep JSON with only objects.
 */
interface TranslationFile extends DeepObject<string | null> {}

/**
 * Flat version of TranslationFile. This is mainly used to simplify merging
 * translations.
 */
interface FlatTranslationFile {
  [keyPathAsJSON: string]: string | null;
}

/**
 * An instance of exporter cache.
 *
 * See createExporterCache for details.
 */
export interface ExporterCache {
  originalTranslationFiles: { [path: string]: FlatTranslationFile };
  currentTranslationFiles: { [path: string]: FlatTranslationFile };
}

/**
 * This creates a new empty cache for the exporter.
 *
 * The cache is required by the exporter and is used to merge the translations
 * from the original translation file. It will be  mutated by the exporter
 * and the same instance must be given untouched across export calls.
 */
export function createExporterCache(): ExporterCache {
  return {
    originalTranslationFiles: {},
    currentTranslationFiles: {},
  };
}

/**
 * Take a deep translation file and flatten it.
 * This is to simplify merging keys later on.
 *
 * @param deep Deep translation file.
 */
function flattenTranslationFile(deep: TranslationFile): FlatTranslationFile {
  const result: FlatTranslationFile = {};

  for (const [k, v] of Object.entries(deep)) {
    if (typeof v === 'object' && v !== null) {
      // Nested case, we must recurse
      const flat = flattenTranslationFile(v);
      for (const [flatK, flatV] of Object.entries(flat)) {
        result[JSON.stringify([k, ...JSON.parse(flatK)])] = flatV;
      }
    } else {
      // Leaf, just set the value.
      result[JSON.stringify([k])] = v;
    }
  }

  return result;
}

/**
 * Take a flat translation file and make it deep.
 *
 * This is to make a flat translation file ready to be exported to a file.
 *
 * @param flat Flat translation file as returned by flattenTranslationFile
 */
function unflattenTranslationFile(flat: FlatTranslationFile): TranslationFile {
  const result: TranslationFile = {};

  for (const [k, v] of Object.entries(flat)) {
    const keyPath = JSON.parse(k);
    const cleanKey = keyPath.pop();
    const error = new ExportError(
      `${PLUGIN_NAME}: Couldn't export translations. Key "${keyPath}" ` +
        `has a conflict.`,
    );

    let obj = result;
    for (const p of keyPath) {
      const currentValue = obj[p];
      if (typeof currentValue === 'string' || currentValue === null) {
        throw error;
      }
      obj = obj[p] = currentValue || {};
    }

    const currentValue = obj[cleanKey];
    if (typeof currentValue === 'object' && currentValue !== null) {
      throw error;
    }
    obj[cleanKey] = v;
  }

  return result;
}

/**
 * Load translation given a file. If the file is not found, default to empty
 * object.
 * @param filePath Path of the JSON translation file to load.
 */
function loadTranslationFile(filePath: string): FlatTranslationFile {
  let content: string;
  try {
    content = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }

  return flattenTranslationFile(JSON.parse(content));
}

/**
 * Create a new translationFile with a key added to it.
 *
 * @param translationFile The translation file to add the key to.
 * @param key The translation key to add.
 * @param locale Current locale being exported
 * @param config Configuration (that will help setting the proper default
 *   value)
 */
function addKeyToTranslationFile(
  translationFile: FlatTranslationFile,
  key: TranslationKey,
  locale: string,
  config: Config,
): FlatTranslationFile {
  // compute the default value
  let defaultValue = config.defaultValue;
  const keyAsDefaultValueEnabled =
    config.keyAsDefaultValue === true ||
    (Array.isArray(config.keyAsDefaultValue) &&
      config.keyAsDefaultValue.includes(locale));
  const keyAsDefaultValueForDerivedKeys =
    config.keyAsDefaultValueForDerivedKeys;
  if (
    keyAsDefaultValueEnabled &&
    (keyAsDefaultValueForDerivedKeys || !key.isDerivedKey)
  ) {
    defaultValue = key.cleanKey;
  }

  if (key.parsedOptions.defaultValue) {
    defaultValue = key.parsedOptions.defaultValue;
  }

  return {
    [JSON.stringify([...key.keyPath, key.cleanKey])]: defaultValue,
    ...translationFile,
  };
}

/**
 * Exports all given translation keys as JSON.
 *
 * @param keys: translation keys to export
 * @param locale: the locale to export
 * @param config: plugin configuration
 * @param cache: cache instance to use (see createExporterCache)
 */
export default function exportTranslationKeys(
  keys: TranslationKey[],
  locale: string,
  config: Config,
  cache: ExporterCache,
): void {
  const keysPerFilepath: { [path: string]: TranslationKey[] } = {};

  for (const key of keys) {
    // Figure out in which path each key should go.
    const filePath = config.outputPath
      .replace('{{locale}}', locale)
      .replace('{{ns}}', key.ns);
    keysPerFilepath[filePath] = [...(keysPerFilepath[filePath] || []), key];
  }

  for (const [filePath, keysForFilepath] of Object.entries(keysPerFilepath)) {
    if (!(filePath in cache.originalTranslationFiles)) {
      // Cache original translation file so that we don't loose it across babel
      // passes.
      cache.originalTranslationFiles[filePath] = loadTranslationFile(filePath);
    }

    let translationFile = cache.currentTranslationFiles[filePath] || {};

    for (const k of keysForFilepath) {
      translationFile = addKeyToTranslationFile(
        translationFile,
        k,
        locale,
        config,
      );
    }

    cache.currentTranslationFiles[filePath] = translationFile;

    let deepTranslationFile: TranslationFile;
    if (config.discardOldKeys) {
      const originalTranslationFile = cache.originalTranslationFiles[filePath];
      const alreadyTranslated = Object.keys(originalTranslationFile)
        .filter(k => k in translationFile)
        .reduce<FlatTranslationFile>(
          (accumulator, k) => ({
            ...accumulator,
            [k]: originalTranslationFile[k],
          }),
          {},
        );
      deepTranslationFile = unflattenTranslationFile({
        ...translationFile,
        ...alreadyTranslated,
      });
    } else {
      deepTranslationFile = unflattenTranslationFile({
        ...translationFile,
        ...cache.originalTranslationFiles[filePath],
      });
    }

    // Finally do the export
    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(
      filePath,
      stringify(deepTranslationFile, { space: config.jsonSpace }),
      {
        encoding: 'utf8',
      },
    );
  }
}
