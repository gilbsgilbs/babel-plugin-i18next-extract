import {Trans} from 'react-i18next';

const foo = (<Trans>{'very simple key'}</Trans>);
const explicitKeyLiteral = (<Trans i18nKey='explicitKeyLiteral'>notgood</Trans>);
const explicitKeyJSXExpression = (<Trans i18nKey={'explicitKeyJSXExpression'}>notgood</Trans>);

export function MyComponent() {
  <Trans>hello</Trans>
  return (
    <Trans>
      hello world
    </Trans>
  );
}
