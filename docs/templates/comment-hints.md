# Comment hints

Comment hints are JS comments that have a special meaning. They always start with
`i18next-extract-` and allow you to specify "on-the-fly" behaviors to the plugin, in a
similar way to what ESLint does with `eslint-disable-next-line` comments.

## Disable extraction on a specific line or code section

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

## Explicitly specify contexts for a key

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

## Explicitly use a namespace for a key

```javascript
// i18next-extract-mark-ns-next-line forced-ns
i18next.t("this key will be in forced-ns namespace")

i18next.t("this one also", {ns: 'this-ns-wont-be-used'}) // i18next-extract-mark-ns-line forced-ns

// i18next-extract-mark-ns-start forced-ns
i18next.t("and still this one")
// i18next-extract-mark-ns-stop forced-ns
```

## Explicitly enable/disable a plural form for a key

```javascript
// i18next-extract-mark-plural-next-line
i18next.t("this key will be in forced in plural form")

// i18next-extract-mark-plural-next-line disable
i18next.t("this key wont have plural form", {count})
```
