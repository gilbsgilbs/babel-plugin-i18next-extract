# babel-plugin-i18next-extract

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Build Status](https://dev.azure.com/gilbsgilbert/babel-plugin-i18next-extract/_apis/build/status/gilbsgilbs.babel-plugin-i18next-extract?branchName=master)](https://dev.azure.com/gilbsgilbert/babel-plugin-i18next-extract/_build/latest?definitionId=1&branchName=master) [![codecov](https://codecov.io/gh/gilbsgilbs/babel-plugin-i18next-extract/branch/master/graph/badge.svg?token=qPbMt14hUY)](https://codecov.io/gh/gilbsgilbs/babel-plugin-i18next-extract) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com) [![Greenkeeper badge](https://badges.greenkeeper.io/gilbsgilbs/babel-plugin-i18next-extract.svg)](https://greenkeeper.io/)

---

> Note: This project is still under active, early development.

babel-plugin-i18next-extract is a [Babel Plugin](https://babeljs.io/docs/en/plugins/) that will
traverse your JavaScript/Typescript code in order to find i18next translation keys.

## Installation

Just install the plugin from npm:

```bash
yarn add --dev babel-plugin-i18next-extract

# or

npm i --save-dev babel-plugin-i18next-extract
```

## Usage

If you already use [Babel](https://babeljs.io), chances are you already have an existing babel
configuration (e.g. a `.babelrc` file). Just add declare the plugin and you're good to go:

```javascript
{
  "plugins": [
    "i18next-extract",
    // your other plugins…
  ]
}
```

> To work properly, the plugin must run **before** any JSX transformation step.

You can pass additional options to the plugin by declaring it as follow:

```javascript
{
  "plugins": [
    ["i18next-extract", {"nsSeparator": "~"}],
    // your other plugins…
  ]
}
```

If you don't have a babel configuration yet, you can follow the [Configure Babel](
https://babeljs.io/docs/en/configuration) documentation to try setting it up.

You can then just build your app normally or run Babel through [Babel CLI](
https://babeljs.io/docs/en/babel-cli):

```bash
yarn run babel -f .babelrc 'src/**/*'

# or

npm run babel -f .babelrc 'src/**/*'
```

You should then be able to see the extracted translations in the `extractedTranslations/`
directory. Magic huh? Next step is to check out all the available [configuration options
](#configuration).

## Usage with create-react-app

TODO: It should be enough to use babel-preset-react-app and declare the plugin in babelrc,
but I have to check this out.

## Features

- [x] Translation extraction in [JSON v3 format](https://www.i18next.com/misc/json-format).
- [x] Detection of `i18next.t()` function calls.
- [x] Plural forms support:
  - [x] Keys derivation depending on the locale.
  - [x] Automatic detection from `i18next.t` function calls.
  - [x] Automatic detection from `react-i18next` properties.
  - [ ] (todo) Manual detection from comment hints.
- [x] Contexts support:
  - [x] Naïve implementation with default contexts.
  - [x] Automatic detection from `i18next.t` function calls.
  - [x] Automatic detection from `react-i18next` properties.
  - [ ] (todo) Manual detection from comment hints.
- [x] [react-i18next](https://react.i18next.com/) support:
  - [x] `Trans` component support (with plural forms, contexts and namespaces).
  - [x] `useTranslation` hook support (with plural forms, contexts and namespaces).
  - [x] `Translation` render prop support (with plural forms, contexts and namespaces).
  - [ ] (todo) Fuzzy namespace inference from `withTranslation` HoC.
- [x] Namespace inference:
  - [x] Depending on the key value.
  - [x] Depending on the `t()` function options.
  - [x] Depending on the `ns` property in `Translation` render prop.
  - [x] Depending on the `ns` attribute in the `Trans` component.
- [x] Explicitely disable extraction on a specific file sections or lines using comment hints.
- [x] … and more?

## Configuration

| Option | Type | Description | Default |
|-----------------------|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| locales | `string[]` | All the locales your project supports. babel-plugin-i18next-extract will generate a JSON file for each locale. | `['en']` |
| defaultNS | `string` | The default namespace that your translation use. | `'translation'` |
| pluralSeparator | `string` | String you want to use to split plural from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'_'` |
| contextSeparator | `string` | String you want to use to split context from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'_'` |
| keySeparator | `string` or `null` | String you want to use to split keys. Set to `null` if you don't want to split your keys or if you want to use keys as value. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'.'` |
| nsSeparator | `string` or `null` | String you want to use to split namespace from keys. Set to `null` if you don't want to infer a namespace from key value or if you want to use keys as value. See See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `':'` |
| i18nextInstancesNames | `string[]` | Possible names of you `i18next` object instances. This will be used to detect `i18next.t` calls. | `['i18next', 'i18n']` |
| defaultContexts | `string[]` | Default context keys to create when detecting a translation with context. | `['', '_male', '_female']` |
| outputPath | `string` | Path where translation keys should be extracted to. You can put `{{ns}}` and `{{locale}}` placeholders in the value to change the location depending on the namespace or the locale. | `extractedTranslations/{{locale}}/{{ns}}.json` |
| defaultValue | `string` or `null` | Default value for extracted keys. | `''` (empty string) |
| useKeyAsDefaultValue | `boolean` or `string[]` | If true, use the extracted key as defaultValue (ignoring `defaultValue` option). You can also specify an array of locales to apply this behavior only to a specific set locales (e.g. if you keys are in plain english, you may want to set this option to `['en']`). | `false` |
| exporterJsonSpace | `number` | Number of indentation space to use in extracted JSON files. | 2 |

## Comment hints

If the plugin extracts a key you want to skip or erroneously tries to parse a function that doesn't
belong to i18next, you can use a comment hint to disable the extraction:

```javascript
// i18next-extract-disable-next-line
i18next.t("this key won't be extracted")

i18next.t("neither this one") // i18next-extract-disable-line

// i18next-extract-disable
i18next.t("or this one")
i18next.t("and this one")
// i18next-extract-enable

i18next.t("but this one will be")
```

Notice you can put a `// i18next-extract-disable` comment at the top of the file in order to
disable extraction on the entire file.

Comment hints may also be used in the future to explicitly mark keys as having plural forms or
contexts (and specify which ones), or to specify a namespace. Stay tuned.

## Gotchas

The plugin tries to be smart, but can't do magic. i18next has a runtime unlike this plugin which
must guess everything statically. For instance, you may want to disable extraction on dynamic
keys:

```javascript
i18next.t(myVariable);
i18next.t(`error.${code}`);
```

If you try to extract keys from this code, the plugin will issue a warning because it won't be
able to infer the translations statically. If you really want to specify variable keys, you should
skip them with a [comment hint](#comment-hints). The same goes for plural forms, context and
namespace detection:

```javascript
i18next.t("myKey", myOpts); // This won't work.
```

However, in React components, it might come handy to be a little smarter than that. That's why
when using a `<Trans>` component, the plugin will try to resolve references before resigning. For
instance, this code should extract properly:

```javascript
const foo = <p>Hello</p>
const bar = <Trans>{foo} world</Trans>
```