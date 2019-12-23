import { withTranslation } from 'react-i18next';
import * as ReactI18Next from 'react-i18next';

function MyComponent0(props) {
  return <p>{props.t('key0')}</p>
}

function MyComponent1({t, i18n}) {
  return <p>{t('key1')}</p>
}

const MyComponent2 = ({t, i18n}) => {
  return <p>{t('key2')}</p>
}

const MyComponent3 = function ({t, i18n}) {
  return <p>{t('key3')}</p>
}

const MyComponent4 = function ({dontCareAboutT}) {
  return <p>{dontCareAboutT('noob')}</p>
}

ReactI18Next.withTranslation()(MyComponent0);
withTranslation()(MyComponent1);
withTranslation()(MyComponent2);
withTranslation()(connect()(MyComponent3));
withTranslation()(MyComponent4);
