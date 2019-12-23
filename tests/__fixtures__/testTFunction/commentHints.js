t('noob0'); // i18next-extract-disable-line
t('noob1'); /* i18next-extract-disable-line */

// i18next-extract-disable-next-line
t('noob2');

// i18next-extract-mark-ns-next-line forcedns
t('keyns0')

// i18next-extract-mark-ns-next-line forcedns
t('keyns1', {ns: 'noobns'})

// i18next-extract-mark-plural-next-line
t('pluralkey0');

// i18next-extract-mark-plural-next-line enable
t('pluralkey1');

// i18next-extract-mark-plural-next-line disable
t('not-pluralkey');

// i18next-extract-mark-context-next-line
t('default-context0');

// i18next-extract-mark-context-next-line enable
t('default-context1');

// i18next-extract-mark-context-next-line disable
t('no-context', {context: 'hello'});

// i18next-extract-mark-context-next-line ["fruit", "animal"]
t('custom-context0');

// i18next-extract-mark-context-next-line null
t('custom-context1');

// i18next-extract-mark-context-next-line custom_context
t('custom-context2');
