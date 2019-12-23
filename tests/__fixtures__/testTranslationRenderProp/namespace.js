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

const comp3 = (
  <Translation>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const noob = 'noob';
const comp4 = (
  // i18next-extract-mark-ns-next-line nsHint
  <Translation ns={noob}>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const comp5 = (
  // see https://github.com/gilbsgilbs/babel-plugin-i18next-extract/issues/69
  <Translation ns='nsPartial'>
    {
      (t) => {
        foobar(t);
        return t('hello world');
      }
    }
  </Translation>
);
