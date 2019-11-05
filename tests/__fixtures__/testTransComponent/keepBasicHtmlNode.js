import {Trans} from 'react-i18next';

// Tag without closing tag should not be converted to indices
const trans0 = (
  <Trans>
    Trans<br />0
  </Trans>
);

// Tag with closing tag should not be converted to indices
const trans1 = (
  <Trans>
    <p>Trans 1</p>
  </Trans>
);

// Tag with attributes should not be converted to indices
const trans2 = (
  <Trans>
    <p className="fizzBuzz">Trans 2</p>
  </Trans>
);

// Tags not set in config should be converted to indices
const trans3 = (
  <Trans>
    <strong>Trans 3<hr /></strong>
  </Trans>
);