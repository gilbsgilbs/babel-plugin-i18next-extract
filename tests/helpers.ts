import { TranslationKey } from "../src/keys";

export function createTranslationKey(
  key: string,
  keyPath: string[] = [],
): TranslationKey {
  return {
    key,
    keyPath,
    sourceNodes: [],
    extractorName: "anonymous",
    isDerivedKey: false,
    parsedOptions: {
      contexts: false,
      hasCount: false,
      keyPrefix: null,
      ns: null,
      defaultValue: null,
    },
    cleanKey: key,
    ns: "translation",
  };
}
