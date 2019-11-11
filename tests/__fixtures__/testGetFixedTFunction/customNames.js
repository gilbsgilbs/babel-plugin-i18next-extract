import i18next from "i18next";

const iceT = i18next.getFixedT(null, 'ns0');
const _ = i18next.getFixedT(null, 'ns1');
const t = i18next.getFixedT(null, 'ns2');

iceT('pgm');
_('_');
t('ctm'); // allow non-declared names
