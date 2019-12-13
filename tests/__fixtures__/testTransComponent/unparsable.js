import {Trans} from 'react-i18next';

const good = (<Trans>good</Trans>);
const notGood0 = (<Trans>{unknown_identifier}</Trans>);
const notGood1 = (<Trans>{{foo: 'bar', bar: 'baz'}}</Trans>);
const notGood2 = (<Trans i18nKey={notGood}>notGood</Trans>);
const notGood3 = (<Trans>{{}}</Trans>);

const unparsableRef = NotGoodComponentFunc();
const notGood4 = (<Trans>{unparsableRef}</Trans>);
