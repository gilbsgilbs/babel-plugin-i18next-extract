import { useTranslation } from 'react-i18next';

export function MyComponent1() {
  const [t] = useTranslation('ns0');
  return <p>{t('key0')}{t('key1')}</p>
}

export function MyComponent2() {
  const [t] = useTranslation(['ns1', 'noob']);
  return <p>{t('key0')}</p>
}

export function MyComponent3() {
  const foo = 'noob';
  // i18next-extract-mark-ns-next-line ns2
  const [t] = useTranslation(foo);
  return <p>{t('key0')}</p>
}

export function MyComponent4() {
  // see https://github.com/gilbsgilbs/babel-plugin-i18next-extract/issues/69
  const { t } = useTranslation('ns3');
  someFunc(t);
  return <p>{t('key0')}</p>
}

export function MyComponent5() {
  const { t: aliasedT } = useTranslation('ns4');
  return <p>{aliasedT('key0')}</p>
}
