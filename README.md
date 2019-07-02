# babel-plugin-i18next-extract

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://dev.azure.com/gilbsgilbert/babel-plugin-i18next-extract/_apis/build/status/gilbsgilbs.babel-plugin-i18next-extract?branchName=master)](https://dev.azure.com/gilbsgilbert/babel-plugin-i18next-extract/_build/latest?definitionId=1&branchName=master)
[![codecov](https://codecov.io/gh/gilbsgilbs/babel-plugin-i18next-extract/branch/master/graph/badge.svg?token=qPbMt14hUY)](https://codecov.io/gh/gilbsgilbs/babel-plugin-i18next-extract)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com) [![Greenkeeper badge](https://badges.greenkeeper.io/gilbsgilbs/babel-plugin-i18next-extract.svg)](https://greenkeeper.io/)
[![NPM](https://nodei.co/npm/babel-plugin-i18next-extract.png?downloads=true)](https://www.npmjs.com/package/babel-plugin-i18next-extract)

---

babel-plugin-i18next-extract is a [Babel Plugin](https://babeljs.io/docs/en/plugins/) that will
traverse your Javascript/Typescript code in order to find i18next translation keys.

## Features

- ☑️ Keys extraction in [JSON v3 format](https://www.i18next.com/misc/json-format).
- ☑️ Detection of `i18next.t()` function calls.
- ☑️ Full [react-i18next](https://react.i18next.com/) support.
- ☑️ Plurals support.
- ☑️ Contexts support.
- ☑️ Namespace detection.
- ☑️ Disable extraction on a specific file sections or lines using [comment hints](
  #comment-hints).
- ☑️ Overwrite namespaces, plurals and contexts on-the-fly using [comment hints](
  #comment-hints).
- [… and more?](./CONTRIBUTING.md)

## Installation

```bash
yarn add --dev babel-plugin-i18next-extract

# or

npm i --save-dev babel-plugin-i18next-extract
```

## Usage

If you already use [Babel](https://babeljs.io), chances are you already have an babel
configuration (e.g. a `.babelrc` file). Just add declare the plugin and you're good to go:

```javascript
{
  "plugins": [
    "i18next-extract",
    // your other plugins…
  ]
}
```

You can also specify additional [configuration options](#configuration) to the plugin:

```javascript
{
  "plugins": [
    ["i18next-extract", {"nsSeparator": "~"}],
    // your other plugins…
  ]
}
```

Once you are set up, you can build your app normally or run Babel through [Babel CLI](
https://babeljs.io/docs/en/babel-cli):

```bash
yarn run babel -f .babelrc 'src/**/*.{js,jsx,ts,tsx}'

# or

npm run babel -f .babelrc 'src/**/*.{js,jsx,ts,tsx}'
```

Extracted translations should land in the `extractedTranslations/` directory. Magic huh?

If you don't have a babel configuration yet, you can follow the [Configure Babel](
https://babeljs.io/docs/en/configuration) documentation to try setting it up.

## Configuration

| Option | Type | Description | Default |
|-|-|-|-|
| locales | `string[]` | Locales your project supports. | `['en']` |
| defaultNS | `string` | The default namespace that your translation use. | `'translation'` |
| pluralSeparator | `string` | String you want to use to split plural from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'_'` |
| contextSeparator | `string` | String you want to use to split context from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'_'` |
| keySeparator | `string` or `null` | String you want to use to split keys. Set to `null` if you don't want to split your keys or if you want to use keys as value. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `'.'` |
| nsSeparator | `string` or `null` | String you want to use to split namespace from keys. Set to `null` if you don't want to infer a namespace from key value or if you want to use keys as value. See See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc) | `':'` |
| i18nextInstancesNames | `string[]` | Possible names of you `i18next` object instances. This will be used to detect `i18next.t` calls. | `['i18next', 'i18n']` |
| defaultContexts | `string[]` | Default context keys to create when detecting a translation with context. | `['', '_male', '_female']` |
| outputPath | `string` | Path where translation keys should be extracted to. You can put `{{ns}}` and `{{locale}}` placeholders in the value to change the location depending on the namespace or the locale. | `extractedTranslations/{{locale}}/{{ns}}.json` |
| defaultValue | `string` or `null` | Default value for extracted keys. | `''` (empty string) |
| keyAsDefaultValue | `boolean` or `string[]` | If true, use the extracted key as defaultValue (ignoring `defaultValue` option). You can also specify an array of locales to apply this behavior only to a specific set locales (e.g. if you keys are in plain english, you may want to set this option to `['en']`). | `false` |
| keyAsDefaultValueForDerivedKeys | `boolean` | If false and `keyAsDefaultValue` is enabled, don't use derived keys (plural forms or contexts) as default value. `defaultValue` will be used instead. | `true` |
| exporterJsonSpace | `number` | Number of indentation space to use in extracted JSON files. | 2 |

## Comment hints

### Disable extraction on a specific section

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

You can put a `// i18next-extract-disable` comment at the top of the file in order to disable
extraction on the entire file.

### Explicitly specify contexts for a key

This is very useful if you want to use different contexts than the default `male` and `female`
for a given key:

```javascript
// i18next-extract-mark-context-next-line ["dog", "cat"]
i18next.t("this key will have dog and cat context", {context: dogOrCat})

// i18next-extract-mark-context-next-line
i18next.t("this key will have default context, although no context is specified")

// i18next-extract-mark-context-next-line disable
i18next.t("this key wont have a context, although a context is specified", {context})

i18next.t("can be used on line") // i18next-extract-mark-context-line

// i18next-extract-mark-context-start
i18next.t("or on sections") 
// i18next-extract-mark-context-stop

const transComponent = (
  // i18next-extract-mark-context-next-line
  <Trans>it also works on Trans components</Trans>
)
```

### Explicitly use a namespace for a key

```javascript
// i18next-extract-mark-ns-next-line forced-ns
i18next.t("this key will be in forced-ns namespace")

i18next.t("this one also", {ns: 'this-ns-wont-be-used'}) // i18next-extract-mark-ns-line forced-ns

// i18next-extract-mark-ns-start forced-ns
i18next.t("and still this one")
// i18next-extract-mark-ns-stop forced-ns
```

### Explicitly enable/disable a plural form for a key

```javascript
// i18next-extract-mark-plural-next-line
i18next.t("this key will be in forced in plural form")

// i18next-extract-mark-plural-next-line disable
i18next.t("this key wont have plural form", {count})
```

## Usage with create-react-app

[create-react-app](https://github.com/facebook/create-react-app) doesn't let you modify the babel
configuration. Fortunately, it's still possible to use this plugin without ejecting. First of all,
install Babel CLI:

```bash
yarn add --dev @babel/cli

# or

npm add --save-dev @babel/cli
```

Create a minimal `.babelrc` that uses the `react-app` babel preset (DO NOT install it, it's already
shipped with CRA):

```javascript
{
  "presets": ["react-app"],
  "plugins": ["i18next-extract"]
}
```

You should then be able to extract your translations using the CLI:

```bash
# NODE_ENV must be specified for react-app preset to work properly
NODE_ENV=development yarn run babel -f .babelrc 'src/**/*.{js,jsx,ts,tsx}'
```

To simplify the extraction, you can add a script to your `package.json`:

```javascript
"scripts": {
  […]
  "i18n-extract": "NODE_ENV=development babel -f .babelrc 'src/**/*.{js,jsx,ts,tsx}'",
  […]
}
```

And then just run:

```bash
yarn run i18n-extract

# or

npm run i18n-extract
```

## Gotchas

The plugin tries to be a little smart, but can't do magic. i18next has a runtime unlike this
plugin which must guess everything statically. For instance, you may want to disable extraction
on dynamic keys:

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
