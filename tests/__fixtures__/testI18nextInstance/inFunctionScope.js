import { i18next } from './mymodule';

function myFunction() {
    i18next.t('hello');
    i18next.t('hello world');
}

const arrowFunction = () => {
    i18next.t('very simple key')
}
