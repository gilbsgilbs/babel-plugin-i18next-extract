import stringify from 'json-stable-stringify';

import { Exporter, ConflictError } from './commons';

/**
 * JSONv3 values can be any valid value for JSON file.
 *
 * See i18next's "returnObjects" option.
 */
type JsonV3Value =
  | string
  | number
  | null
  | JsonV3Value[]
  | { [k: string]: JsonV3Value };

/**
 * Content of a JSON v3 file.
 */
interface JsonV3File {
  whitespacesBefore: string;
  whitespacesAfter: string;
  content: { [k: string]: JsonV3Value };
}

/**
 * Check whether a JsonV3Value is a plain object.
 */
function jsonV3ValueIsObject(
  val: JsonV3Value,
): val is { [k: string]: JsonV3Value } {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
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
  value: JsonV3Value,
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
  } else if (!jsonV3ValueIsObject(current)) {
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

const jsonv3Exporter: Exporter<JsonV3File, JsonV3Value> = {
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
      } else if (!jsonV3ValueIsObject(val)) {
        throw new ConflictError();
      }
      current = val;
    }
    return current[cleanKey];
  },
  addKey: (params) => {
    const { key, file, value } = params;

    return {
      ...file,
      content: recursiveAddKey(file.content, key.keyPath, key.cleanKey, value),
    };
  },
};

export default jsonv3Exporter;
