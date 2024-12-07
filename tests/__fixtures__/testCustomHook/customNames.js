import { useMyTranslation, useOtherTranslation } from './i18n';
import { useThirdPartyTranslation } from 'third-party-module';
import * as I18Next from 'third-party-module'

export function MyComponent0() {
	const [_] = useMyTranslation('ns0');
	return <p>{_('key0')}{_('key1')}</p>
}

export function MyComponent1() {
	const [iceT] = useOtherTranslation(['ns1', 'noob']);
	return <p>{iceT('key in ns1')}</p>
}

export function MyComponent2() {
	const { translate } = I18Next.useThirdPartyTranslation('ns2');
	someFunc(translate);
	return <p>{translate('key in ns2')}</p>
}

export function MyComponent3() {
	const foo = 'noob';
	// i18next-extract-mark-ns-next-line ns3
	const [myT] = useThirdPartyTranslation(foo);
	return <p>{myT('key in ns3')}</p>
}

export function MyComponent4() {
	const { translate: aliasedTranslate } = I18Next.useThirdPartyTranslation('ns4');
	someFunc(aliasedTranslate);
	return <p>{aliasedTranslate('key in ns4')}</p>
}
