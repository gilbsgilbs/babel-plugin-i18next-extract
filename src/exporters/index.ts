import fs from 'fs';
import path from 'path';

import { Config } from '../config';
import { TranslationKey } from '../keys';

import { ConflictError, Exporter, ExportError } from './commons';
import jsonv3Exporter from './jsonv3';

export { ConflictError, ExportError };

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
/**
 * An instance of exporter cache.
 *
 * See createExporterCache for details.
 */
export interface ExporterCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalTranslationFiles: { [path: string]: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentTranslationFiles: { [path: string]: any };
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
 * Load a translation file.
 */
function loadTranslationFile<F>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exporter: Exporter<F, any>,
  config: Config,
  filePath: string,
): F {
  let content: string;
  try {
    content = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err) {
    if (err.code === 'ENOENT') return exporter.init({ config });
    throw err;
  }

  return exporter.parse({ config, content });
}

/**
 * Get the default value for a key.
 */
function getDefaultValue(
  key: TranslationKey,
  locale: string,
  config: Config,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
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

  const useI18nextDefaultValueEnabled =
    config.useI18nextDefaultValue === true ||
    (Array.isArray(config.useI18nextDefaultValue) &&
      config.useI18nextDefaultValue.includes(locale));
  const useI18nextDefaultValueForDerivedKeys =
    config.useI18nextDefaultValueForDerivedKeys;
  if (
    useI18nextDefaultValueEnabled &&
    key.parsedOptions.defaultValue !== null &&
    (useI18nextDefaultValueForDerivedKeys || !key.isDerivedKey)
  ) {
    defaultValue = key.parsedOptions.defaultValue;
  }

  return defaultValue;
}

/**
 * Return last modified date for the given file
 *
 * @param filePath
 *
 * @returns {Date|null}
 */
function getFileLastModified(filePath: string): Date | null {
  let mtime;

  try {
    const stats = fs.statSync(filePath);
    mtime = stats.mtime;
  } catch (e) {
    mtime = null;
  }

  return mtime;
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

  const exporter = jsonv3Exporter;

  for (const key of keys) {
    // Figure out in which path each key should go.
    const filePath =
      typeof config.outputPath === 'function'
        ? config.outputPath(locale, key.ns)
        : config.outputPath
            .replace('{{locale}}', locale)
            .replace('{{ns}}', key.ns);

    keysPerFilepath[filePath] = [...(keysPerFilepath[filePath] || []), key];
  }

  for (const [filePath, keysForFilepath] of Object.entries(keysPerFilepath)) {
    const inCache = filePath in cache.originalTranslationFiles;
    // get the mtime of the file
    const lastModified = getFileLastModified(filePath);
    // check if we already have a cached version of that file
    // if there is one we compare the actual mtime with the one in the cache.
    const localeFileHasChanged =
      inCache &&
      !!lastModified &&
      !!cache.originalTranslationFiles[filePath].lastModified &&
      cache.originalTranslationFiles[filePath].lastModified.getTime() !==
        lastModified.getTime();

    if (!inCache || localeFileHasChanged) {
      // Cache original translation file so that we don't loose it across babel
      // passes.
      cache.originalTranslationFiles[filePath] = {
        lastModified: lastModified,
        ...loadTranslationFile(exporter, config, filePath),
      };
    }

    const originalTranslationFile = cache.originalTranslationFiles[filePath];
    let translationFile =
      cache.currentTranslationFiles[filePath] ||
      (config.discardOldKeys
        ? exporter.init({ config })
        : originalTranslationFile);

    for (const k of keysForFilepath) {
      const previousValue = exporter.getKey({
        config,
        file: originalTranslationFile,
        keyPath: k.keyPath,
        cleanKey: k.cleanKey,
      });
      translationFile = exporter.addKey({
        config,
        file: translationFile,
        key: k,
        value:
          previousValue === undefined
            ? getDefaultValue(k, locale, config)
            : previousValue,
      });
    }

    cache.currentTranslationFiles[filePath] = translationFile;

    // if no previous value it means its first time we go over that file
    // if there is compare it with the old one
    if (
      !!cache.originalTranslationFiles[filePath].lastModified &&
      !!translationFile &&
      !!originalTranslationFile &&
      deepEqual(translationFile, originalTranslationFile)
    ) {
      return;
    }
    // Finally do the export
    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(
      filePath,
      exporter.stringify({
        config,
        file: translationFile,
      }),
      {
        encoding: 'utf8',
      },
    );
  }
}
