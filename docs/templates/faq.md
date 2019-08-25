# Frequently Asked Questions

## Why does the plugin show a warning when extracting my key?

The plugin tries to be a little smart, but can't do magic. i18next has a runtime unlike this
plugin which must guess everything statically. For instance, you may want to disable extraction
on dynamic keys:

```javascript
i18next.t(myVariable);
i18next.t(`error.${code}`);
```

If you try to extract keys from this code, the plugin will issue a warning because it won't be
able to infer the translations statically. If you really want to specify variable keys, you should
skip them with a [comment hint](
comment-hints?id=disable-extraction-on-a-specific-line-or-code-section). The same goes for
plural forms, context and namespace detection:

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

## Can I use this plugin with create-react-app?

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

## Can I use natural keys / english strings as keys?

Some prefer using plain english strings as key. While it would probably be preferable to
rely on [default values](
https://www.i18next.com/translation-function/essentials#passing-a-default-value) instead, it is
still possible to make natural keys work with this plugin. Here is a simple configuration that
may help you getting started with natural keys:

```javascript
{
  "locales": ["en", "fr"],

  // Disable keySeparator and nsSeparator since they could conflict with the actual value:
  "keySeparator": null,
  "nsSeparator": null,

  // Alternatively, you can specify separators you are sure to never encounter in a value:
  // "keySeparator": "~~~",
  // "nsSeparator": "==>",

  // If your keys are in english
  "keyAsDefaultValue": ["en"],

  // Ignore plurals and contexts. We can't use natural keys for those.
  "keyAsDefaultValueForDerivedKeys": false,
}
```

## Error: EEXIST: file already exists, mkdir './extractedTranslations/en'

Make sure your node version is at least 10 by running `node --version`. This plugin doesn't
support node 8. You can still use [nvm](https://github.com/nvm-sh/nvm) to deal with multiple node
versions.
