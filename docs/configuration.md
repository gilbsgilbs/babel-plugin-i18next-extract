# Configuration

Here is the exhaustive list of configuration options you can pass to the plugin.
## locales

- **Type**: `string[]`
- **Description**: Locales your project supports.
- **Default value**: `['en']`



## defaultNS

- **Type**: `string`
- **Description**: Default namespace to use when one is not defined explicitly.
- **Default value**: `'translation'`



## pluralSeparator

- **Type**: `string`
- **Description**: String you want to use to split plural from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc).

- **Default value**: `'_'`



## contextSeparator

- **Type**: `string`
- **Description**: String you want to use to split context from keys. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc).

- **Default value**: `'_'`



## keySeparator

- **Type**: `string|null`
- **Description**: String you want to use to split keys. Set to `null` if you don't want to split your keys or if you want to use keys as value. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc).

- **Default value**: `'.'`



## nsSeparator

- **Type**: `string|null`
- **Description**: String you want to use to split namespace from keys. Set to `null` if you don't want to infer a namespace from key value or if you want to use keys as value. See [i18next Configuration options](https://www.i18next.com/overview/configuration-options#misc).
- **Default value**: `':'`



## i18nextInstanceNames

- **Type**: `string[]`
- **Description**: Possible names for your `i18next` instances. This will be used to detect `i18next.t` calls.
- **Default value**: `['i18next', 'i18n']`



#### Example: Custom i18next instance name

```js
/*
   {"i18nextInstanceNames": ["myI18next"]}
*/

// This key will be extracted
myI18next.t("key0");
```




## tFunctionNames

- **Type**: `string[]`
- **Description**: Possible names for your `t` functions. This will only be used for direct calls to `t` functions (i.e. `t('key')`, not `foo.t('key')`) and in very last resort.
- **Default value**: `['t']`



#### Example: Custom t function name

```js
/*
  {"tFunctionNames": ["myT"]}
*/

// This key will be extracted
myT("key0");
```




## defaultContexts

- **Type**: `string[]`
- **Description**: Context values to use when detecting a translation with context.
- **Default value**: `['', '_male', '_female']`



#### Example: Usage of default contexts

```js
/*
  {"defaultContexts": ["", "_male", "_female"]}
*/

// Extracts: key0, key0_male, key0_female
t("key0", {context: myCtx});

/*
  {"defaultContexts": ["_fruit", "_animal"]}
*/

// Extracts: key0_fruit, key0_animal
t("key0", {context: myCtx});
```




## outputPath

- **Type**: `string`
- **Description**: Path where translation keys should be extracted to. You can use `{{ns}}` and `{{locale}}` placeholders in the value to change the location depending on the namespace or the locale.
- **Default value**: `extractedTranslations/{{locale}}/{{ns}}.json`



## defaultValue

- **Type**: `string|null`
- **Description**: Default value for extracted keys.
- **Default value**: `''`



#### Example: Use null as default value

```js
/*
  {"defaultValue": null}
*/

// Extracts: key0 with `null` as default value instead of an empty string.
t("key0");
```




## useI18nextDefaultValue

- **Type**: `boolean|string[]`
- **Description**: If `true` and a [i18next default value](https://www.i18next.com/translation-function/essentials#passing-a-default-value) is set for the key, use this default value (ignoring `defaultValue` option).  
You can also specify an array of locales to apply this behavior only to a specific set locales (e.g. if your i18next default values are in plain french, you may want to set this option to `['fr']`).  
_Note: For `react-i18next` `Trans` component, the children might also be used as default value._

- **Default value**: `['en']`



#### Example: Use i18next default value for all locales

```js
/*
  {"useI18nextDefaultValue": true}
*/

// Extracts: key0 with `Hello world!` as default value.
t("key0", 'Hello world!');
```


#### Example: Use i18next default value for a specific set of locales

```js
/*
  {"useI18nextDefaultValue": ['fr_FR', 'fr_CA']}
*/

// Extracts: key0 with `Bonjour le monde !` as default value, but
// only for specified french locales ("fr_FR" and "fr_CA").
t("key0", 'Bonjour le monde !');
```




## useI18nextDefaultValueForDerivedKeys

- **Type**: `boolean`
- **Description**: If `false` and `useI18nextDefaultValue` is enabled, don't use i18next default value for derived keys (plural forms or contexts). `defaultValue` option will be used instead.
- **Default value**: `false`



#### Example: Skip default value for derived keys

```js
/*
  {
    "useI18nextDefaultValue": true,
    "useI18nextDefaultValueForDerivedKeys": false
  }
*/

// Extracts:
//   - key0 with `Hello world!` as default value.
//   - key0_plural with an empty string as default value.
t("key0", {count: cnt, defaultValue: 'Hello World!'});

// Extracts:
//   - key0 with `Hello world!` as default value.
//   - key0_male with an empty string as default value.
//   - key0_female with an empty string as default value.
t("key0", {context: ctx, defaultValue: 'Hello World!'});
```




## keyAsDefaultValue

- **Type**: `boolean|string[]`
- **Description**: If `true`, use the extracted key as defaultValue (ignoring `defaultValue` option). This is sometimes refered to as "natural keys".   You can also specify an array of locales to apply this behavior only to a specific set locales (e.g. if your keys are in plain english, you may want to set this option to `['en']`).

- **Default value**: `false`



#### Example: Use keys as default value for a set of locales

```js
/*
  {
    "keyAsDefaultValue": ['en_US', 'en_GB']
  }
*/

// Extracts: `Hello world!` with `Hello world!` as default value
// for the specified english locales (`en_US` and `en_GB`)..
// Other locales will have an empty string as default value instead.
t("Hello world!", 'Hello World!');
```




## keyAsDefaultValueForDerivedKeys

- **Type**: `boolean`
- **Description**: If `false` and `keyAsDefaultValue` is enabled, don't use derived keys (plural forms or contexts) as default value. `defaultValue` option will be used instead.

- **Default value**: `true`



#### Example: Don't use key as default value for derived keys

```js
/*
  {
    "keyAsDefaultValue": ['en'],
    "keyAsDefaultValueForDerivedKeys": false
  }
*/

// Extracts:
//   - "Hello World!" with "Hello World!" as default value for `en` locale.
//   - "Hello World!" with an empty string as default value for all other locales.
//   - "Hello World!_plural" with an empty string as default value for all locales.
t("Hello world!", {count: cnt, defaultValue: 'Hello World!'});
```




## discardOldKeys

- **Type**: `boolean`
- **Description**: When set to `true`, keys that no longer exist are removed from the JSON files. By default, new keys will be added to the JSON files and never removed.
- **Default value**: `false`



## jsonSpace

- **Type**: `number`
- **Description**: Number of indentation space to use in extracted JSON files.
- **Default value**: `2`



