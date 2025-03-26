i18next.t("myKey", "items: {{count}}", { count: 22 });

i18next.t("pluralDefaultValues", "custom key one", {
  count: 22,
  defaultValue_one: "custom key one",
  defaultValue_other: "custom key other",
});
i18next.t("pluralDefaultValues.subkey", "custom key one", {
  count: 22,
  defaultValue_one: "custom key one",
  defaultValue_other: "custom key other",
});

i18next.t("ordinalValues", "custom key one", {
  count: 22,
  ordinal: true,
  defaultValue_few: "custom key few",
  defaultValue_one: "custom key one",
  defaultValue_other: "custom key other",
  defaultValue_two: "custom key two",
});
