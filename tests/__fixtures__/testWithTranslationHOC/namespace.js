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

function MyComponent3(props) {
  return <p>{props.t('key3')}</p>
}

const MyComponent4 = ({t}) => {
  return <p>{t('key4')}</p>
}

class MyComponent5 extends React.Component {
  render() {
    const {t} = this.props;
    return <p>{t('key5')}</p>
  }
}

class MyComponent6 extends React.Component {
  render() {
    return <p>{this.props.t('key6')}</p>
  }
}

withTranslation('ns0')(MyComponent0);
withTranslation(['ns1', 'noob'])(MyComponent1);
// i18next-extract-mark-ns-next-line ns2
withTranslation('noob')(MyComponent2);
withTranslation('ns3')(MyComponent3);
withTranslation('ns4')(MyComponent4);
withTranslation('ns5')(MyComponent5);
withTranslation('ns6')(MyComponent6);
