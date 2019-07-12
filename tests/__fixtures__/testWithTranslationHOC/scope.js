import { withTranslation } from 'react-i18next';

// This function isn't in the main scope.
// This should not confuse the parser.
[function MyComponent0(props) {
  return <p>{props.t('noob')}</p>
}]

t('pro')

withTranslation()(MyComponent0);
