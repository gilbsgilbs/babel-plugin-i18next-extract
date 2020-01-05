import {Trans} from 'react-i18next';

import {MyTransComponent, OtherTransComponent} from './i18n'
import * as I18n from './i18n'

const foo = (<MyTransComponent>{'very simple key'}</MyTransComponent>);
const bar = (<OtherTransComponent>
  different component with <strong>strong</strong> and {{interpolation: foo}}
</OtherTransComponent>);
const wildcard = (<I18n.MyTransComponent>using wildcard</I18n.MyTransComponent>);

const notTranslated = (<Trans>regular component</Trans>);
const simpleDiv = (<div>a text in a standard div</div>);
const otherI18nComponent = (<I18n.DifferentComponent>not a trans comp</I18n.DifferentComponent>);
