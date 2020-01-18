import {EnhancedTrans} from "third-party-module"
import * as ThirdPartyModule from "third-party-module"
import * as FourthPartyModule from "fourth-party-module"
import {NotTransComponent} from "fourth-party-module"
import {MyTransComponent, OtherTransComponent} from './i18n'
import * as I18n from './i18n'

// extracted
const foo = (
  <MyTransComponent>very simple key</MyTransComponent>
);
const bar = (
  <OtherTransComponent>other very simple key</OtherTransComponent>
);
const wildcard = (
  <I18n.MyTransComponent>using wildcard</I18n.MyTransComponent>
);

const thirdParty = (
  <EnhancedTrans>from third party module</EnhancedTrans>
);
const thirdPartyWildcard = (
  <ThirdPartyModule.EnhancedTrans>
    from third party module with wildcard
  </ThirdPartyModule.EnhancedTrans>
);

// not extracted
const fourthParty = (
  <NotTransComponent>from fourth party module</NotTransComponent>
);
const fourthPartyWildcard = (
  <FourthPartyModule.EnhancedTransComponent>
    from fourth party module with wildcard
  </FourthPartyModule.EnhancedTransComponent>
);
const thirdPartyWrong = (
  <ThirdPartyModule.NotTransComponent>
    from third party module with wildcard
  </ThirdPartyModule.NotTransComponent>
);
