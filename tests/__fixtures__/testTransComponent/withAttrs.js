import {Trans} from 'react-i18next';

const withCount = (
  <Trans count={count}>
    withCount
  </Trans>
);

const withContext = (
  <Trans tOptions={{context: 'male'}}>
    withContext
  </Trans>
);

const withContextOnlyIdentifier = (
  <Trans tOptions={{context}}>
    withContextOnlyIdentifier
  </Trans>
);

const withJSXNS = (
  <Trans ns={'jsxns'}>
    withJSXNS
  </Trans>
);

const withJSXArrayNS = (
  <Trans ns={['jsxns', 'ignored']}>
    withJSXArrayNS
  </Trans>
);

const withLiteralNS = (
  <Trans ns='literalns'>
    withLiteralNS
  </Trans>
);

const withNSHint = (
  <Trans ns='noob'>{/* i18next-extract-mark-ns-line hintns */}
    withHintNS
  </Trans>
);
