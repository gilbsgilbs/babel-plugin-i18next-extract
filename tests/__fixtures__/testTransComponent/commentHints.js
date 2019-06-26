import {Trans} from 'react-i18next';

const disabled = (
  // i18next-extract-disable-next-line 
  <Trans>
    noob
  </Trans>
);

const withPlural = (
  // i18next-extract-mark-plural-next-line 
  <Trans>
    plural
  </Trans>
);

const withoutPlural = (
  // i18next-extract-mark-plural-next-line disable
  <Trans>
    not plural
  </Trans>
);

const withoutContext = (
  // i18next-extract-mark-context-next-line disable
  <Trans tOptions={{context: "noob"}}>
    no context
  </Trans>
);

const withDefaultContext = (
  // i18next-extract-mark-context-next-line
  <Trans>
    default context
  </Trans>
);

const withCustomContext = (
  // i18next-extract-mark-context-next-line ["cat", "dog"]
  <Trans>
    custom context
  </Trans>
);

const withCustomNs = (
  // i18next-extract-mark-ns-next-line forcedns
  <Trans ns='noobns'>
    custom ns
  </Trans>
);