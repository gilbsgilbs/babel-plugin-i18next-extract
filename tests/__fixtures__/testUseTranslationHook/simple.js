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

export function MyComponent3() {
  const {i18n} = useTranslation();
  return <p>Shouldn't crash</p>
}

export function MyComponent4() {
  const { t } = ReactI18Next.useTranslation();
  t('from wildcard import');
}