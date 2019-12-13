import { Trans } from "react-i18next";

const comp0 = (
  <Trans i18nKey="key0">
    I read the{" "}
    <a
      href="https://www.example.com/tos"
      target="_blank"
      rel="noopener noreferrer"
    >
      TOS
    </a>{" "}
    and the{" "}
    <a
      href="https://www.example.com/privacy"
      target="_blank"
      rel="noopener noreferrer"
    >
      Privacy Policy
    </a>{" "}
    and accept them.
  </Trans>
);

// Line returns should be stripped
const comp1 = <Trans i18nKey="key1">
  <span>Hello</span>


  <span>World 1</span>
</Trans>;

// A single whitespace should not be stripped
const comp2 = <Trans i18nKey="key2">
  <span>Hello</span> <span>World 2</span>
</Trans>;

// Multiple whitespaces should not be stripped
const comp3 = <Trans i18nKey="key3">
  <span>Hello</span>   <span>World 3</span>
</Trans>;