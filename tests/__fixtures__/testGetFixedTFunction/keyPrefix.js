import i18next from "i18next";

export function anyJSFunction1() {
  const t = i18next.getFixedT(null, 'ns0', 'deep0');
  t('key0');
}

export function anyJSFunction2() {
  const t = i18next.getFixedT(null, 'ns1', 'deep1.deep2');

  t('key1');
}

export function anyJSFunction3() {
  const t = i18next.getFixedT(null, 'ns2', 'deep3.deep4');

  t('key2.key3');
}
