import { TranslationKey } from '../../src/keys';

export function createSimpleKey(
  key: string,
  keyPath: string[] = [],
): TranslationKey {
  return {
    key,
    keyPath,
    sourceNodes: [],
    extractorName: 'anonymous',
    isDerivedKey: false,
    parsedOptions: {
      contexts: false,
      hasCount: false,
      ns: null,
      defaultValue: null,
    },
    cleanKey: key,
    ns: 'translation',
  };
}
