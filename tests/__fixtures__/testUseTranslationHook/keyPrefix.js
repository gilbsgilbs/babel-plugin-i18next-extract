import { useTranslation } from 'react-i18next';

export function MyComponent1() {
  const [t] = useTranslation('ns0', { keyPrefix: 'deep0' });
  return <p>{t('key0')}{t('key1')}</p>
}

export function MyComponent2() {
  const [t] = useTranslation('ns1', { keyPrefix: 'deep1.deep2' });
  return <p>{t('key2')}{t('key3')}</p>
}

export function MyComponent3() {
  const [t] = useTranslation('ns2', { keyPrefix: 'deep3.deep4' });
  return <p>{t('key4.key5')}{t('key4.key6')}</p>
}

export function MyComponent4() {
  const [t] = useTranslation('ns3', { keyPrefix: 'deep5.deep6' });
  return <p>{t('key7.key8')}{t('key9.key10')}</p>
}

export function MyComponent5() {
  const [t] = useTranslation('ns4', { keyPrefix: 'deep7.deep8' });
  return <p>{t('ns5:key11')}</p>
}

export function MyComponent6() {
  const { t: aliasedT } = useTranslation('ns6', { keyPrefix: 'deep1.deep2' });
  return <p>{aliasedT('key12')}</p>
}

