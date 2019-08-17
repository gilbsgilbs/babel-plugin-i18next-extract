<!-- THIS FILE WAS GENERATED FROM A TEMPLATE. DO NOT EDIT IT MANUALLY. -->

# Contribution Guide

First of all, thanks for taking time to contribute.

## Case 0: You found a typo somewhere and want to fix it

Please fix it and [submit a PR](https://help.github.com/en/articles/creating-a-pull-request).
I'd be more than happy to merge it.

## Case 1: You found a bug somewhere and want to fix it

### Know your basics

If you've never contributed to a babel plugin before, the [Babel Plugin Handbook
](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) is
the place to start. Unfortuntely, the plugin API is not really well documented at the moment, so
you'll probably have to play around, dig into Babel source code and StackOverflow a bit. [
AST Explorer](https://astexplorer.net/) might also be of help.

In our pain, we're slightly lucky though because this plugin doesn't perform any transformation
on the AST. It just parses it.

You'll also need some confidence with [TypeScript](https://www.typescriptlang.org/).

### Run the tests

Running the tests should be as simple as:

```
yarn install
yarn run test
```

The test framework is [Jest](https://jestjs.io), therefore, you can pass any option recognized by
jest after `yarn run test`. If everything is green, you can move along.

### Write a failing test

Once you've learned everything, write a test-case to reproduce the issue. Open the directory
`tests/__fixtures__/` and browse the files and directories a bit. You should notice that test
cases consist in:
- One JSON file that describes the test, the plugin options and the expected extracted keys
- One or more `.js` files against which the extraction will be run.

In most cases `tests/__fixtures__/tFunction/simple.{json,js}` should be a good starting point.
Just copy those two files in a relevant directory within `__fixtures__` and the framework will
discover the tests automatically.

Please, always make sure your test case is the minimal reproduction scenario possible.

### Fix the issue

You can now dig into the plugin source code to try to fix the bug. Have a look at the [Project
Structure](#project-structure) below to better understand how the project is designed (even
though it should rather be self-explainatory).

### Test against your own project

If the issue occurred in one of your own projects, you might want to check whether your patch does
actually fix your original issue. `yarn link` can help running the extraction using your modified
version of `babel-plugin-i18next-extract`:

```bash
cd path/to/babel-plugin-i18next-extract
yarn link
yarn build
cd path/to/your/project
yarn link babel-plugin-i18next-extract
```

Then run the extraction as you'd normally do and check if everything works as expected.

### Polish

This project uses [ESLint](https://eslint.org) to detect potential issues and [Prettier
](https://prettier.io) to enforce a consistant code style. You can automatically fix obvious
issues and code style using `yarn run lint --fix`.

### Update documentation

The documentation must reflect the changes you made if you added or changed something.

- If you added or changed an option, update `docs/_templates/configuration.md.yml` accordingly.
- Make any relevant changes to the other files in `docs/*.md`.
- Build the whole doc by running `cd docs/ && yarn install && yarn run build`.
- Check that it looks good: `yarn run serve`.
- Commit all the changes you made to `docs/`.

### Submit

Run the tests one last time, fork, commit and push. Create a PR with a relevant description of
the issue and specific attention points.

## Case 2: You want to develop a new feature

In this case it is **very** important that you open an issue first, especially if the required
work is consequent. We may need to discuss on the design, the maintainance burden it would add,
etc. If you still want to make it, you may follow an approach close to the previous case. Do not
hesitate to open the PR early and prefix it with "[WIP]", so that other contributors can be
informed that you're working on it.

## Project Structure

- `extractors/`: everything that performs translations extraction from the AST should be put in
  this module. Extractors exports a default function that is called from `plugin.ts` on specific
  node paths.
    - `commons.ts`: exports helper functions that are common to the extractors. In particular,
      those function might be helpers to parse the AST. This module also export a
      `ExtractionError` class that is thrown with an explicit error message when an error occurs
      within an extractor.
    - Other files are just extractors for different type of nodes.
- `comments.ts` parses the comment hints.
- `config.ts` parses babel configuration options.
- `constants.ts` exports constants that may be re-used across the project. It's mainly there to
  avoir cyclic dependencies.
- `exporter.ts` exports JSON files after the keys are extracted.
- `index.ts` exports the plugin for Babel.
- `keys.ts` perform operations on extracted keys (keys derivation from plural forms or context,
  namespace inference from key value, …).
- `plugin.ts` the actual babel traverser.

## Need more info?

If you need any further information or help, do not hesitate to get in touch by opening an issue
or any other way.

