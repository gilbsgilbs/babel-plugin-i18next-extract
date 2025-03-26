i18next.t("myKey", { count: 22 });

i18next.t("pluralDefaultValues", {
  count: 22,
  defaultValue_one: "one",
  defaultValue_other: "other",
});
i18next.t("pluralDefaultValues.subkey", "custom key one", {
  count: 22,
  defaultValue_one: "custom key one",
  defaultValue_other: "custom key other",
});

i18next.t("ordinalValues", { count: 22, ordinal: true });
