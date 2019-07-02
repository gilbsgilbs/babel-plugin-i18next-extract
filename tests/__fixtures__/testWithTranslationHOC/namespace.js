import { withTranslation } from 'react-i18next';

function MyComponent0(props) {
  return <p>{props.t('key0')}</p>
}

function MyComponent1(props) {
  return <p>{props.t('key1')}</p>
}

const MyComponent2 = (props) => {
  return <p>{props.t('key2')}</p>
}

withTranslation('ns0')(MyComponent0);
withTranslation(['ns1', 'noob'])(MyComponent1);
// i18next-extract-mark-ns-next-line ns2
withTranslation('noob')(MyComponent2);