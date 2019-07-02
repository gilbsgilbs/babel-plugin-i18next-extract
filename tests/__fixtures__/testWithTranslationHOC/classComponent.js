import * as React from 'react';
import { withTranslation } from 'react-i18next';
import * as ReactI18Next from 'react-i18next';

class MyComponent0 extends React.PureComponent {
  render() {
    return <p>{this.props.t('key0')}</p>
  }
}

class MyComponent1 extends React.Component {
  render() {
    const t = this.props.t;
    return <p>{t('key1')}</p>
  }
}

class MyComponent2 extends React.Component {
  render() {
    const {t} = this.props;
    return <p>{t('key2')}</p>
  }
}

class MyComponent3 extends React.Component {
  custom() {
    return <p>{this.props.t('key3')}</p>
  }

  render() {
    return <p>OK</p>
  }
}

class NotWrapped extends React.Component {
  render() {
    // this shouldn't be extracted because the component isn't wrapped with withTranslation HOC
    return <p>{this.props.t('noob')}</p>
  }
}

ReactI18Next.withTranslation()(MyComponent0);
withTranslation()(MyComponent1);
withTranslation()(MyComponent2);
withTranslation()(MyComponent3);