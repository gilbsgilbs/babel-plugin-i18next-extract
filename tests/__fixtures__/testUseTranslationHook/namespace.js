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
