import i18next from "i18next";

const t = i18next.getFixedT(null, 'ns0');

export function anyJSFunction1() {
    t('key0');
}

export function anyJSFunction2() {
    const t2 = i18next.getFixedT(null, 'ns1');

    t('key1');
    t2('key2');
}
