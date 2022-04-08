import path from 'path';

import * as BabelCore from '@babel/core';
import fs from 'fs-extra';
import { sync as rimraf } from 'rimraf';

import plugin from '../src';
import { Config } from '../src/config';

interface ExpectKeysOpts {
  ns?: string;
  locale?: string;
}

interface TestData {
  // Test directory (e.g. testTCall/)
  testDir: string;

  // Test case description.
  description: string;

  // sucessive .js file paths. If absent, use same name as .json file, but with .js extension.
  // All JS files are applied one after another.
  inputFiles: string[];

  // list of [expected, {ns: 'namespace', 'locale': 'fr'}]
  expectValues: [string, ExpectKeysOpts?][];

  // if we expect an exception rather than a successful extraction
  errorMessageRegexp: string | null;

  pluginOptions: Partial<Config>;
}

/**
 * Yields TestData for each test.
 */
function* genTestData(): IterableIterator<TestData> {
  const fixturesDir = path.join(__dirname, '__fixtures__');

  // List directories in __fixtures__
  const testDirsEnt = fs
    .readdirSync(fixturesDir, { encoding: 'utf8', withFileTypes: true })
    .filter((testDir) => testDir.isDirectory());

  for (const testDirEnt of testDirsEnt) {
    // Listing JSON files in test directories
    const testDir = path.join(fixturesDir, testDirEnt.name);

    const testFilesEnt = fs
      .readdirSync(testDir, {
        encoding: 'utf8',
        withFileTypes: true,
      })
      .filter(
        (testFile) =>
          testFile.isFile() &&
          (testFile.name.endsWith('.json') ||
            testFile.name.includes('.config.js')),
      );

    for (const testFileEnt of testFilesEnt) {
      // testFile is a JSON file
      const testFile = path.join(testDir, testFileEnt.name);

      const rawTestData = testFileEnt.name.includes('.config.js')
        ? require(testFile)
        : fs.readJSONSync(testFile, {
            encoding: 'utf8',
          });
      if (!Array.isArray(rawTestData.expectValues)) {
        rawTestData.expectValues = [[rawTestData.expectValues]];
      }
      const testData: Partial<TestData> = rawTestData;

      const inputFiles =
        testData.inputFiles === undefined
          ? [testFile.replace(/\.json$/, '.js')]
          : testData.inputFiles.map((p) =>
              path.join(testDir, p.replace('/', path.sep)),
            );

      const extractionDir = path.join(
        testDir,
        '.extracted',
        testFileEnt.name.replace(/\.json$/, ''),
      );

      let outputPath;

      if (testData.pluginOptions) {
        if (typeof testData.pluginOptions.outputPath === 'function') {
          // function from config
          outputPath = testData.pluginOptions.outputPath;
        }

        if (
          typeof testData.pluginOptions.outputPath === 'string' &&
          !!testData.pluginOptions.outputPath
        ) {
          // value from config
          outputPath = path.join(
            extractionDir,
            testData.pluginOptions.outputPath as string,
          );
        } else {
          // no value provided from config
          outputPath = path.join(
            extractionDir,
            'translations.{{ns}}.{{locale}}.json',
          );
        }
      }

      rimraf(extractionDir);

      yield {
        testDir: testDirEnt.name,
        description:
          testData.description || 'Missing description. Please provide one.',
        inputFiles,
        expectValues: testData.expectValues || [],
        pluginOptions: {
          ...testData.pluginOptions,
          outputPath,
        },
        errorMessageRegexp: rawTestData.errorMessageRegexp || null,
      };
    }
  }
}

function readExtractedFile(
  outputPath: ((locale: string, ns: string) => string) | string,
  opts?: ExpectKeysOpts,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const ns = (opts && opts.ns) || 'translation';
  const locale = (opts && opts.locale) || 'en';

  const realOutputPath =
    typeof outputPath === 'function'
      ? outputPath(locale, ns)
      : outputPath.replace('{{ns}}', ns).replace('{{locale}}', locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extracted: any;
  try {
    extracted = fs.readJSONSync(realOutputPath, { encoding: 'utf8' });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      err !== null &&
      typeof err == 'object' &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      expect(
        true,
        `Couldn't find a JSON file to read at ${realOutputPath}. This probably means the ` +
          `extraction didn't work.`,
      ).toEqual(false);
    }
    throw err;
  }
  return extracted;
}

function assertHasExpectedValues(
  testData: TestData,
  errorMessage: string | null,
): void {
  if (testData.errorMessageRegexp !== null) {
    if (errorMessage === null) {
      expect(true, 'Expected an error, but got none.').toBe(false);
    } else {
      expect(
        errorMessage.match(testData.errorMessageRegexp),
        `Got error message "${errorMessage}" which doesn't match` +
          ` expected regexp "${testData.errorMessageRegexp}".`,
      ).toBeTruthy();
    }
  }
  for (const [expected, opts] of testData.expectValues) {
    const path =
      typeof testData.pluginOptions.outputPath === 'function'
        ? testData.pluginOptions.outputPath(
            opts?.locale || 'en',
            opts?.ns || 'translation',
          )
        : testData.pluginOptions.outputPath;

    const extracted = readExtractedFile(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      path!,
      opts,
    );
    expect(extracted, `opts=${JSON.stringify(opts)}`).toEqual(expected);
  }
}

/**
 * Run all tests from __fixtures__ folder.
 */
export function runChecks(): void {
  for (const testData of genTestData()) {
    describe(`${testData.testDir}/${path.basename(testData.inputFiles[0])}: ${
      testData.description
    }`, () => {
      it(`should have all expected values`, () => {
        let errorMessage: string | null = null;

        // Run extraction
        for (const jsFilePath of testData.inputFiles) {
          let transformResult: BabelCore.BabelFileResult | null = null;
          try {
            transformResult = BabelCore.transformFileSync(jsFilePath, {
              plugins: [[plugin, testData.pluginOptions]],
            });
          } catch (err) {
            if (err instanceof Error) {
              errorMessage = err.message;
            } else {
              errorMessage = `${err}`;
            }
            break;
          }
          expect(
            transformResult && transformResult.code,
            'Babel transformation failed.',
          ).toBeTruthy();
        }

        assertHasExpectedValues(testData, errorMessage);
      });
    });
  }
}
