import * as React from 'react';
import { withTranslation } from 'react-i18next';


class MyComponent0 extends React.PureComponent {
  render() {
    // This should not be extracted as t is not the callee.
    ensure('not-extracted-0', this.props.t);
    return t('OK');
  }
}

class MyComponent1 extends React.Component {
  render() {
    const t = this.props.t;
    ensureT('not-extracted-1', t);
    return null;
  }
}

class MyComponent2 extends React.Component {
  render() {
    const {t} = this.props;
    ensureT('not-extracted-2', t);
    return null;
  }
}

class MyComponent3 extends React.Component {
  custom() {
    ensureT('not-extracted-3', this.props.t);
  }

  render() {
    return null;
  }
}

withTranslation()(MyComponent0);
withTranslation()(MyComponent1);
withTranslation()(MyComponent2);
withTranslation()(MyComponent3);
