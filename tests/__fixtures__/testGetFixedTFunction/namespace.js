import i18next from "i18next";

export function anyJSFunction1() {
    const t = i18next.getFixedT(null, 'ns0');

    t('key0');
    t('key1');
}

export function anyJSFunction2() {
    const t = i18next.getFixedT('en', 'ns1');

    t('key0');
}

export function anyJSFunction3() {
    const t = i18next.getFixedT(['en', 'de'], 'ns2');

    t('key0');
}

export function anyJSFunction4() {
    const t = i18next.getFixedT(['en', 'de'], ['ns3', 'noob']);

    t('key0');
}

export function anyJSFunction5() {
    const t = i18next.getFixedT('en', ['ns4', 'noob']);

    t('key0');
}

export function anyJSFunction6() {
    const t = i18next.getFixedT(null, ['ns5', 'noob']);

    t('key0');
}
