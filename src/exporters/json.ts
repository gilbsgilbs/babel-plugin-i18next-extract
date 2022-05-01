import stringify from 'json-stable-stringify';

import { Exporter, ConflictError } from './commons';

/**
 * JSONv* values can be any valid value for JSON file.
 *
 * See i18next's "returnObjects" option.
 */
type JsonVxValue =
  | string
  | number
  | null
  | JsonVxValue[]
  | { [k: string]: JsonVxValue };

/**
 * Content of a JSONv* file.
 */
interface JsonVxFile {
  whitespacesBefore: string;
  whitespacesAfter: string;
  content: { [k: string]: JsonVxValue };
}

/**
 * Check whether a JsonVxValue is a plain object.
 */
function jsonVxValueIsObject(
  val: JsonVxValue,
): val is { [k: string]: JsonVxValue } {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Add a key recursively to a JSONv4 file.
 *
 * @param fileContent JSONv* file content
 * @param keyPath keyPath of the key to add
 * @param cleanKey key without path
 * @param value Value to set for the key.
 */
function recursiveAddKey(
  fileContent: JsonVxFile['content'],
  keyPath: string[],
  cleanKey: string,
  value: JsonVxValue,
): JsonVxFile['content'] {
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
  } else if (!jsonVxValueIsObject(current)) {
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

const exporter: Exporter<JsonVxFile, JsonVxValue> = {
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
      } else if (!jsonVxValueIsObject(val)) {
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

export default exporter;
