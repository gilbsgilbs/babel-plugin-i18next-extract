import { useMyTranslation, useOtherTranslation } from './i18n';
import { useThirdPartyTranslation } from 'third-party-module';
import * as I18Next from 'third-party-module'

export function MyComponent0() {
  const [t] = useMyTranslation('ns0');
  return <p>{t('key0')}{t('key1')}</p>
}

export function MyComponent1() {
  const [t] = useOtherTranslation(['ns1', 'noob']);
  return <p>{t('key in ns1')}</p>
}

export function MyComponent2() {
  const { t } = I18Next.useThirdPartyTranslation('ns2');
  someFunc(t);
  return <p>{t('key in ns2')}</p>
}

export function MyComponent3() {
  const foo = 'noob';
  // i18next-extract-mark-ns-next-line ns3
  const [t] = useThirdPartyTranslation(foo);
  return <p>{t('key in ns3')}</p>
}

export function MyComponent4() {
  const { t: aliasedT } = I18Next.useThirdPartyTranslation('ns4');
  someFunc(t);
  return <p>{aliasedT('key in ns4')}</p>
}
