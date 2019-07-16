export interface Config {
  // config options that are common with i18next
  locales: string[];
  defaultNS: string;
  pluralSeparator: string;
  contextSeparator: string;
  keySeparator: string | null;
  nsSeparator: string | null;

  // plugin-specific options
  i18nextInstanceNames: string[];
  tFunctionNames: string[];
  defaultContexts: string[];
  outputPath: string;
  defaultValue: string | null;
  useI18nextDefaultValue: boolean | string[];
  keyAsDefaultValue: boolean | string[];
  keyAsDefaultValueForDerivedKeys: boolean;
  discardOldKeys: boolean;
  jsonSpace: string | number;
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
    keyAsDefaultValue: coalesce(opts.keyAsDefaultValue, false),
    keyAsDefaultValueForDerivedKeys: coalesce(
      opts.keyAsDefaultValueForDerivedKeys,
      true,
    ),
    discardOldKeys: coalesce(opts.discardOldKeys, false),
    jsonSpace: coalesce(opts.jsonSpace, 2),
  };
}
