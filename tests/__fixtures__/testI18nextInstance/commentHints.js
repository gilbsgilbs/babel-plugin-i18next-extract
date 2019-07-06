i18next.t('noob0'); // i18next-extract-disable-line
i18next.t('noob1'); /* i18next-extract-disable-line */

// i18next-extract-disable-next-line
i18next.t('noob2');

// i18next-extract-mark-ns-next-line forcedns
i18next.t('keyns0')

// i18next-extract-mark-ns-next-line forcedns
i18next.t('keyns1', {ns: 'noobns'})

// i18next-extract-mark-plural-next-line
i18next.t('pluralkey0');

// i18next-extract-mark-plural-next-line enable
i18next.t('pluralkey1');

// i18next-extract-mark-plural-next-line disable
i18next.t('not-pluralkey');

// i18next-extract-mark-context-next-line
i18next.t('default-context0');

// i18next-extract-mark-context-next-line enable
i18next.t('default-context1');

// i18next-extract-mark-context-next-line disable
i18next.t('no-context', {context: 'hello'});

// i18next-extract-mark-context-next-line ["fruit", "animal"]
i18next.t('custom-context0');

// i18next-extract-mark-context-next-line null
i18next.t('custom-context1');

// i18next-extract-mark-context-next-line custom_context
i18next.t('custom-context2');