import { resolve } from 'path';

export interface Config {
  // config options that are common with i18next
  locales: string[];
  defaultNS: string;
  pluralSeparator: string;
  contextSeparator: string;
  keySeparator: string | null;
  nsSeparator: string | null;
  transKeepBasicHtmlNodesFor: string[];

  // plugin-specific options
  i18nextInstanceNames: string[];
  customTFunctionNames: string[];
  defaultContexts: string[];
  outputPath: string;
  defaultValue: string | null;
  useI18nextDefaultValue: boolean | string[];
  useI18nextDefaultValueForDerivedKeys: boolean;
  keyAsDefaultValue: boolean | string[];
  keyAsDefaultValueForDerivedKeys: boolean;
  discardOldKeys: boolean;
  jsonSpace: string | number;
  enableExperimentalIcu: boolean;
  customTransComponents: readonly [string, string][];

  // private cache
  cache: {
    absoluteCustomTransComponents: readonly [string, string][];
  };
}

function resolveIfRelative(path: string): string {
  if (path.startsWith('.')) {
    return resolve(path);
  }
  return path;
}

function coalesce<T>(v: T | undefined, defaultVal: T): T {
  return v === undefined ? defaultVal : v;
}

/**
 * Given Babel options, return an initialized Config object.
 *
 * @param opts plugin options given by Babel
 */
export function parseConfig(opts: Partial<Config>): Config {
  const defaultLocales = ['en'];
  const customTransComponents = coalesce(opts.customTransComponents, []);

  return {
    locales: coalesce(opts.locales, defaultLocales),
    defaultNS: coalesce(opts.defaultNS, 'translation'),
    pluralSeparator: coalesce(opts.pluralSeparator, '_'),
    contextSeparator: coalesce(opts.contextSeparator, '_'),
    keySeparator: coalesce(opts.keySeparator, '.'),
    nsSeparator: coalesce(opts.nsSeparator, ':'),
    // From react-i18next: https://github.com/i18next/react-i18next/blob/90f0e44ac2710ae422f1e8b0270de95fedc6429c/react-i18next.js#L334
    transKeepBasicHtmlNodesFor: coalesce(opts.transKeepBasicHtmlNodesFor, [
      'br',
      'strong',
      'i',
      'p',
    ]),

    i18nextInstanceNames: coalesce(opts.i18nextInstanceNames, [
      'i18next',
      'i18n',
    ]),
    customTFunctionNames: coalesce(opts.customTFunctionNames, ['t']),
    defaultContexts: coalesce(opts.defaultContexts, ['', 'male', 'female']),
    outputPath: coalesce(
      opts.outputPath,
      './extractedTranslations/{{locale}}/{{ns}}.json',
    ),
    defaultValue: coalesce(opts.defaultValue, ''),
    useI18nextDefaultValue: coalesce(opts.useI18nextDefaultValue, false),
    useI18nextDefaultValueForDerivedKeys: coalesce(
      opts.useI18nextDefaultValueForDerivedKeys,
      false,
    ),
    keyAsDefaultValue: coalesce(opts.keyAsDefaultValue, false),
    keyAsDefaultValueForDerivedKeys: coalesce(
      opts.keyAsDefaultValueForDerivedKeys,
      true,
    ),
    discardOldKeys: coalesce(opts.discardOldKeys, false),
    jsonSpace: coalesce(opts.jsonSpace, 2),
    enableExperimentalIcu: coalesce(opts.enableExperimentalIcu, false),
    customTransComponents,
    cache: {
      absoluteCustomTransComponents: customTransComponents.map(
        ([sourceModule, importName]) => [
          resolveIfRelative(sourceModule),
          importName,
        ],
      ),
    },
  };
}
