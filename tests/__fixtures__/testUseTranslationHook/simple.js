import React from 'react';
import { useTranslation } from 'react-i18next';
import * as ReactI18Next from 'react-i18next';

export function MyComponent0() {
  t.invalid('noob');
  const { t, i18n } = useTranslation();
  return <p>{t('key0')}</p>
}

export function MyComponent1() {
  const [t, i18n] = useTranslation();
  return <p>{t('key1')}</p>
}

const MyComponent2 = () => {
  const { t, i18n } = useTranslation();
  return <p>{t('key2')}</p>
}

const MyComponent3 = () => {
  const { t, i18n } = useTranslation();
  return <p>{t('key3.key4')}</p>
}

export function MyComponent4() {
  const {i18n} = useTranslation();
  return <p>Shouldn't crash</p>
}

export function MyComponent5() {
  const { t } = ReactI18Next.useTranslation();
  t('from wildcard import');
}

export function MyComponent6() {
  const { t: aliasedT } = ReactI18Next.useTranslation();
  aliasedT('from wildcard import but aliased');
}

export const MyComponent7 = () => {
  const { t: aliasedT } = useTranslation();
  return <p>{aliasedT('key5')}</p>
}
