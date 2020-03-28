# Frequently Asked Questions

## Why does the plugin show a warning when extracting my key?

The plugin tries to be a little smart, but can't do magic. i18next itself has a runtime unlike
this plugin which must guess everything statically. For instance, specifying keys that depend on a
variable would issue a warning:

```javascript
i18next.t(myVariable);
i18next.t(`error.${code}`);
```

See [How to deal with variable keys](#how-to-deal-with-variable-keys) for more insights on how to
work around this use-case. Yet if you really need to stick to variable keys, you will have to skip
them explicitly by using a [comment hint](
comment-hints?id=disable-extraction-on-a-specific-line-or-code-section).

For the same reason, you must always pass i18next options directly:

```javascript
i18next.t("hello", { count: myCnt, defaultValue: 'Hello!' }); // This is OK.
i18next.t("hello", myOpts); // This won't work.
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
still possible to make natural keys work with this plugin.  
Note that [useI18nextDefaultValue
](https://i18next-extract.netlify.com/#/configuration?id=usei18nextdefaultvalue) supersedes the
[keyAsDefaultValue](https://i18next-extract.netlify.com/#/configuration?id=keyasdefaultvalue)
option in the cases where you do specify a default. Here is a simple configuration that may help
you getting started with natural keys:

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
  
  //The default value is ["en"], so it's best to turn this off explicitly
  "useI18nextDefaultValue": false, 

  // Ignore plurals and contexts. We can't use natural keys for those.
  "keyAsDefaultValueForDerivedKeys": false,
}
```

## How to deal with variable keys?

It is sometimes useful to have a translation key depend on the value of variable:

```javascript
let code = 404;
i18next.t(`error.${error}`); // "File not found"

code = 500;
i18next.t(`error.${error}`); // "Internal server error"
```

However, this plugin will fail to extract such key because it is not able to guess all the
possible values the `error` variable can take.

The recommended way to cope with this use-case is to use contexts:

```javascript
// i18next-extract-mark-context-next-line ["", "404", "500"]
i18next.t("error", { context: code.toString() });
```

This would extract the following JSON:

```json
{
  "error": "Unknown error",
  "error_404": "File not found",
  "error_500": "Internal server error"
}
```
