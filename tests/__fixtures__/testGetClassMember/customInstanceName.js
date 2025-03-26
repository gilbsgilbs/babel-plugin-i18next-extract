class Clazz1 {
  getTranslation() {
    return this.pgm.t("key1", "some value");
  }
}

class Clazz2 {
  getTranslation() {
    return this._.t("key2", "some value");
  }
}
class Clazz3 {
  getTranslation() {
    return this.foo.t("key3", "some value");
  }
}
