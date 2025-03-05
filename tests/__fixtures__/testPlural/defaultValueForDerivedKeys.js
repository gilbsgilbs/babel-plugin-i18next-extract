i18next.t("myKey", { count: 22 });

i18next.t("pluralDefaultValues", {
  count: 22,
  defaultValue_one: "custom key one",
  defaultValue_other: "custom key other",
});

i18next.t("ordinalValues", {
  count: 22,
  ordinal: true,
  defaultValue_ordinal_few: "custom key few",
  defaultValue_ordinal_one: "custom key one",
  defaultValue_ordinal_other: "custom key other",
  defaultValue_ordinal_two: "custom key two",
});
