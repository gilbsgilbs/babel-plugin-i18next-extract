import { init as i18nextInit } from 'i18next';

import plugin from './plugin';

i18nextInit({
  // FIXME https://github.com/gilbsgilbs/babel-plugin-i18next-extract/issues/203
  compatibilityJSON: 'v3',
});

export default plugin;
