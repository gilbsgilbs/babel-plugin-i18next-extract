import {Translation} from 'react-i18next';

const comp0 = (
  <Translation ns='nsLiteral'>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const comp1 = (
  <Translation ns={'nsJSXLiteral'}>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const comp2 = (
  <Translation ns={['nsJSXArray', 'noob']}>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const comp4 = (
  <Translation>
    {
      (t) => t('hello world')
    }
  </Translation>
);