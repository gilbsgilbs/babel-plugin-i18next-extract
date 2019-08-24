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
comment-hints.md?id=disable-extraction-on-a-specific-line-or-code-section). The same goes for
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

Yes it's possible. See [Usage with create-react-app](
examples?id=usage-with-create-react-app).

## Can I use natural keys / english strings as keys?

Yes it's possible. See [Setup for natural keys](
examples?id=setup-for-natural-keys).

## Error: EEXIST: file already exists, mkdir './extractedTranslations/en'

Make sure your node version is at least 10 by running `node --version`. This plugin doesn't
support node 8. You can still use [nvm](https://github.com/nvm-sh/nvm) to deal with multiple node
versions.
