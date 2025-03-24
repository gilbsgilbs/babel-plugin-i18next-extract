import fs from "fs";
import path from "path";

import deepmerge from "deepmerge";

import { Config } from "../config";
import { TranslationKey } from "../keys";

import { ConflictError, Exporter, ExportError } from "./commons";
import jsonExporter from "./json";

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
function loadTranslationFile<F>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exporter: Exporter<F, any>,
  config: Config,
  filePath: string,
): F {
  let content: string;
  try {
    content = fs.readFileSync(filePath, { encoding: "utf8" });
  } catch (err) {
    if (
      err !== null &&
      typeof err == "object" &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    )
      return exporter.init({ config });
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
    defaultValue = key.key;
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

  // Use defaultValue_somekey
  if (
    key.parsedOptions?.defaultValues?.length > 0 &&
    useI18nextDefaultValueForDerivedKeys &&
    key.isDerivedKey
  ) {
    const derivedIdentifier = `${config.pluralSeparator}${key.cleanKey.split(config.pluralSeparator).pop()}`;
    const foundValue = key.parsedOptions.defaultValues.find(
      ([defaultValueKey]) => defaultValueKey === derivedIdentifier,
    );

    if (foundValue != null) {
      defaultValue = foundValue[1];
    }
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

  const exporter = jsonExporter;

  for (const key of keys) {
    // Figure out in which path each key should go.
    const filePath =
      typeof config.outputPath === "function"
        ? config.outputPath(locale, key.ns)
        : config.outputPath
            .replace("{{locale}}", locale)
            .replace("{{ns}}", key.ns);

    keysPerFilepath[filePath] = [...(keysPerFilepath[filePath] || []), key];
  }

  for (const [filePath, keysForFilepath] of Object.entries(keysPerFilepath)) {
    cache.originalTranslationFiles[filePath] = deepmerge(
      cache.originalTranslationFiles[filePath] ?? {},
      loadTranslationFile(exporter, config, filePath),
      {
        // Overwrites the existing array values completely rather than concatenating them
        arrayMerge: (dest, source) => source,
      },
    );

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
        encoding: "utf8",
      },
    );
  }
}
