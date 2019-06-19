import {Trans} from 'react-i18next';

// Simple references should work.
function foo() {
  let simpleRef = 'fail';
  simpleRef = 'other fail';
  simpleRef = 'huge fail';
  simpleRef = 'simple ref';
  const trans0 = (
    <Trans>
      Some {simpleRef}
    </Trans>
  );
}

// As well as complex references.
const complexRef = (
  <div>
    <strong>Deep reference</strong>
  </div>
);
const trans1 = (
  <Trans>
    Some {complexRef}
  </Trans>
);