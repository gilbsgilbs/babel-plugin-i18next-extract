import { useTranslation } from 'react-i18next';

function Component() {
    const foo = () => t('key0');
    const { t } = useTranslation('custom-ns');
}
