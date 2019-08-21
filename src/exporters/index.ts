import fs from 'fs';
import path from 'path';

import { TranslationKey } from '../keys';
import { Config } from '../config';
import { ConflictError, ExportError } from './commons';
import jsonv3Exporter from './jsonv3';

export { ConflictError, ExportError };

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadTranslationFile(config: Config, filePath: string): any {
  let content: string;
  try {
    content = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err) {
    if (err.code === 'ENOENT') return jsonv3Exporter.init({ config });
    throw err;
  }

  return jsonv3Exporter.parse({ config, content });
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
      cache.originalTranslationFiles[filePath] = loadTranslationFile(
        config,
        filePath,
      );
    }

    const originalTranslationFile = cache.originalTranslationFiles[filePath];
    let translationFile =
      cache.currentTranslationFiles[filePath] ||
      (config.discardOldKeys
        ? jsonv3Exporter.init({ config })
        : originalTranslationFile);

    for (const k of keysForFilepath) {
      const previousValue = jsonv3Exporter.getKey({
        config,
        file: originalTranslationFile,
        keyPath: k.keyPath,
        cleanKey: k.cleanKey,
      });
      translationFile = jsonv3Exporter.addKey({
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

    // Finally do the export
    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(
      filePath,
      jsonv3Exporter.stringify({
        config,
        file: translationFile,
      }),
      {
        encoding: 'utf8',
      },
    );
  }
}
