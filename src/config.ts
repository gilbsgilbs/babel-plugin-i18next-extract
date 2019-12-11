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
  tFunctionNames: string[];
  defaultContexts: string[];
  outputPath: string;
  defaultValue: string | null;
  useI18nextDefaultValue: boolean | string[];
  useI18nextDefaultValueForDerivedKeys: boolean;
  keyAsDefaultValue: boolean | string[];
  keyAsDefaultValueForDerivedKeys: boolean;
  discardOldKeys: boolean;
  jsonSpace: string | number;
  icu: boolean;
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
    tFunctionNames: coalesce(opts.tFunctionNames, ['t']),
    defaultContexts: coalesce(opts.defaultContexts, ['', 'male', 'female']),
    outputPath: coalesce(
      opts.outputPath,
      './extractedTranslations/{{locale}}/{{ns}}.json',
    ),
    defaultValue: coalesce(opts.defaultValue, ''),
    useI18nextDefaultValue: coalesce(
      opts.useI18nextDefaultValue,
      defaultLocales,
    ),
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
    icu: coalesce(opts.icu, false),
  };
}
