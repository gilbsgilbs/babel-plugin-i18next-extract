# Examples

## Setup for natural keys

Some prefer using plain english strings as key. While it would probably be preferable to
rely on [default values](
https://www.i18next.com/translation-function/essentials#passing-a-default-value) instead, it is
still possible to make natural keys work with this plugin. Here is a simple configuration that
may help you setup natural keys:

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
