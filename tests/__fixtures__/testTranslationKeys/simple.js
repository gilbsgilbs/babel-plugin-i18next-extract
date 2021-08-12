const menuItems = [{
  i18nKey: "homeKey",
  name: "Home Menu"
}, {
  i18nToken: "profile.menu",
  tabIndex: 42
}]

export function MyComponent() {
  const { t } = useTranslation()
  return (
    <ul>
      <li>{t(menuItems[0].i18nKey)}</li>
      <li>{t(menuItems[1].i18nToken)}</li>
      <li>{t("logoutKey")}</li>
    </ul>
  );
}
