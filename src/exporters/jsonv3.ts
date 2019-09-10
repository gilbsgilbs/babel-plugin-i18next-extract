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
interface JsonV3File {
  whitespacesBefore: string;
  whitespacesAfter: string;
  content: DeepObject<JsonV3Key>;
}

/**
 * Add a key recursively to a JSONv3 file.
 *
 * @param fileContent JSONv3 file content
 * @param keyPath keyPath of the key to add
 * @param cleanKey key without path
 * @param value Value to set for the key.
 */
function recursiveAddKey(
  fileContent: JsonV3File['content'],
  keyPath: string[],
  cleanKey: string,
  value: string | null,
): JsonV3File['content'] {
  if (keyPath.length === 0) {
    return {
      ...fileContent,
      [cleanKey]: value,
    };
  }

  const currentKeyPath = keyPath[0];
  let current = fileContent[currentKeyPath];
  if (current === undefined) {
    current = {};
  } else if (current === null || typeof current !== 'object') {
    throw new ConflictError();
  }

  return {
    ...fileContent,
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
    return {
      whitespacesBefore: '',
      whitespacesAfter: '\n',
      content: {},
    };
  },
  parse: ({ content }) => {
    const whitespacesBeforeMatch = content.match(/^(\s*)/);
    const whitespacesAfterMatch = content.match(/(\s*)$/);
    return {
      whitespacesBefore:
        whitespacesBeforeMatch === null ? '' : whitespacesBeforeMatch[0],
      whitespacesAfter:
        whitespacesAfterMatch === null ? '' : whitespacesAfterMatch[0],
      content: JSON.parse(content),
    };
  },
  stringify: ({ config, file }) => {
    return (
      file.whitespacesBefore +
      stringify(file.content, { space: config.jsonSpace }) +
      file.whitespacesAfter
    );
  },
  getKey: ({ file, keyPath, cleanKey }) => {
    let current = file.content;
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
    return {
      ...file,
      content: recursiveAddKey(file.content, key.keyPath, key.cleanKey, value),
    };
  },
};

export default jsonv3Exporter;
