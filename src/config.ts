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
  defaultContexts: string[];
  outputPath: string;
  defaultValue: string | null;
  useKeyAsDefaultValue: boolean | string[];
  exporterJsonSpace: string | number;
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
  return {
    locales: coalesce(opts.locales, ['en']),
    defaultNS: coalesce(opts.defaultNS, 'translation'),
    pluralSeparator: coalesce(opts.pluralSeparator, '_'),
    contextSeparator: coalesce(opts.contextSeparator, '_'),
    keySeparator: coalesce(opts.keySeparator, '.'),
    nsSeparator: coalesce(opts.nsSeparator, ':'),

    i18nextInstanceNames: coalesce(opts.i18nextInstanceNames, [
      'i18next',
      'i18n',
    ]),
    defaultContexts: coalesce(opts.defaultContexts, ['', 'male', 'female']),
    outputPath: coalesce(
      opts.outputPath,
      './extractedTranslations/{{locale}}/{{ns}}.json',
    ),
    defaultValue: coalesce(opts.defaultValue, ''),
    useKeyAsDefaultValue: coalesce(opts.useKeyAsDefaultValue, false),
    exporterJsonSpace: coalesce(opts.exporterJsonSpace, 2),
  };
}
