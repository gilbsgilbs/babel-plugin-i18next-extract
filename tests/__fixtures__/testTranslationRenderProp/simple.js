import {Translation} from 'react-i18next';

const empty = (
  // Shouldn't extract anything.
  <Translation></Translation>
);

const comp0 = (
  <Translation>
    {
      (t) => t('hello world')
    }
  </Translation>
);

const comp1 = (
  <Translation>
    {
      (t) => <p>123{t('withPlural', {count: 22})}</p>
    }
  </Translation>
);

export function MyComponent() {
  return (
    <Translation>
      {
        (t) => t('hello')
      }
    </Translation>
  );
}