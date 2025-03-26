/*
  i18next-extract-mark-ns-next-line secret-ns
*/
class Clazz1 {
  getTranslation() {
    return this.i18n.t("key", "some value");
  }
}

class Clazz2 {
  getTranslation() {
    return this.i18n.t("key", "some value", { ns: "secret-ns-2" });
  }
}

class Clazz3 {
  getTranslation() {
    return this.i18n.t("secret-ns-3:key", "some value");
  }
}
