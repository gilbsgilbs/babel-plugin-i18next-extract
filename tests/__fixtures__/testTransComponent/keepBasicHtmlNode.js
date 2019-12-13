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

// Tags with attributes should not be converted to indices
const trans2 = (
  <Trans>
    <p className="fizzBuzz">Trans 2</p>
  </Trans>
);

// Tags not set in config should be converted to indices
const trans3 = (
  <Trans>
    <strong>Trans 3</strong>
  </Trans>
);

// Unnested tags should not be converted to indices
const trans4 = (
  <Trans>
    <p>Trans 4</p>
    <p></p>
    <p>{"foo"}</p>
    <p>{/* comment */}bar{/* comment */}</p>
  </Trans>
);

// We should resolve identifiers
const myString = "Trans 5";
const trans5 = (
  <Trans>
    <p>{myString}</p>
  </Trans>
);

// Interpolated variables should be converted to indices
const trans6 = (
  <Trans>
    <p>{{myString}}</p>
  </Trans>
);

// Multiple children should be converted to indices
const trans7 = (
  <Trans>
    <p>Trans 7<hr /></p>
  </Trans>
);

// Unresovable identifiers are converted to indices (arbitrarily)
// They will be omitted in the export anyways.
const trans8 = (
  <Trans>
    <p>{unresolvable}</p>
  </Trans>
);
