import fs from 'fs';
import path from 'path';
import { TranslationKey } from './keys';
import { Config } from './config';
import { PLUGIN_NAME } from './constants';

export class ExportError extends Error {}

interface DeepObject<V = string> {
  [k: string]: DeepObject<V> | V;
}

/**
 * Load translation given a file. If the file is not found, default to empty
 * object
 * @param filePath Path of the JSON translation file to load.
 */
function loadTranslationFile(filePath: string): DeepObject<string | null> {
  let content: string;

  try {
    content = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }

  const obj = JSON.parse(content);
  return obj;
}

/**
 * Exports all given translation keyr as JSON.
 *
 * @param keys: translation keys to export
 * @param locale: the locale to export
 * @param config: plugin configuration
 */
export default function exportTranslationKeys(
  keys: TranslationKey[],
  locale: string,
  config: Config,
): void {
  const keysPerFilepath: { [filename: string]: TranslationKey[] } = {};

  for (const key of keys) {
    const filePath = config.outputPath
      .replace('{{locale}}', locale)
      .replace('{{ns}}', key.ns);
    keysPerFilepath[filePath] = [...(keysPerFilepath[filePath] || []), key];
  }

  for (const [filePath, keysForFilepath] of Object.entries(keysPerFilepath)) {
    let obj: DeepObject<string | null> = {};
    obj = loadTranslationFile(filePath);
    const originalObject = obj;

    for (const k of keysForFilepath) {
      // resolve key path
      for (const p of k.keyPath) {
        let value = obj[p];
        if (value === undefined) {
          value = obj[p] = {};
        }
        if (typeof value === 'string' || value === null) {
          throw new ExportError(
            `${PLUGIN_NAME}: Couldn't export translations. Key "${k.key}" ` +
              `has conflict.`,
          );
        }
        obj = value;
      }

      // The key was already exported.
      if (obj[k.cleanKey] !== undefined) {
        continue;
      }

      // Set the default values for the path
      let defaultValue = config.defaultValue;
      if (
        config.useKeyAsDefaultValue === true ||
        (Array.isArray(config.useKeyAsDefaultValue) &&
          config.useKeyAsDefaultValue.includes(locale))
      ) {
        defaultValue = k.cleanKey;
      }
      obj[k.cleanKey] = defaultValue;
    }

    // Finally do the export
    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(originalObject, null, config.exporterJsonSpace),
      {
        encoding: 'utf8',
      },
    );
  }
}
