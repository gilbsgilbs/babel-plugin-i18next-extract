import stringify from 'json-stable-stringify';

import { Exporter, ConflictError } from './commons';

/**
 * A deep, recursive object which leaves must be of generic type V.
 */
interface DeepObject<V = string> {
  [k: string]: DeepObject<V> | V;
}

/**
 * JSON keys can either be strings or null.
 */
type JsonV3Key = string | null;

/**
 * Content of a JSON v3 file.
 */
interface JsonV3File extends DeepObject<JsonV3Key> {}

/**
 * Add a key recursively to a JSONv3 file.
 *
 * @param file JSONv3 file
 * @param keyPath keyPath of the key to add
 * @param cleanKey key without path
 * @param value Value to set for the key.
 */
function recursiveAddKey(
  file: JsonV3File,
  keyPath: string[],
  cleanKey: string,
  value: string | null,
): JsonV3File {
  if (keyPath.length === 0) {
    return {
      ...file,
      [cleanKey]: value,
    };
  }

  const currentKeyPath = keyPath[0];
  let current = file[currentKeyPath];
  if (current === undefined) {
    current = {};
  } else if (current === null || typeof current !== 'object') {
    throw new ConflictError();
  }

  return {
    ...file,
    [currentKeyPath]: recursiveAddKey(
      current,
      keyPath.slice(1),
      cleanKey,
      value,
    ),
  };
}

const jsonv3Exporter: Exporter<JsonV3File, JsonV3Key> = {
  init: () => {
    return {};
  },
  parse: ({ content }) => {
    return JSON.parse(content);
  },
  stringify: ({ config, file }) => {
    return stringify(file, { space: config.jsonSpace });
  },
  getKey: ({ file, keyPath, cleanKey }) => {
    let current = file;
    for (const p of keyPath) {
      const val = current[p];
      if (val === undefined) {
        return undefined;
      }
      if (typeof val === 'string' || val === null) {
        throw new ConflictError();
      }
      current = val;
    }
    const val = current[cleanKey];
    if (typeof val !== 'string' && val !== null && val !== undefined) {
      throw new ConflictError();
    }
    return val;
  },
  addKey: params => {
    const { key, file, value } = params;
    return recursiveAddKey(file, key.keyPath, key.cleanKey, value);
  },
};

export default jsonv3Exporter;
