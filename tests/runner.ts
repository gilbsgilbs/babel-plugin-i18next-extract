import * as BabelCore from '@babel/core';
import fs from 'fs-extra';
import path from 'path';
import { sync as rimraf } from 'rimraf';

import { Config } from '../src/config';
import plugin from '../src';

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
    .filter(testDir => testDir.isDirectory());

  for (const testDirEnt of testDirsEnt) {
    // Listing JSON files in test directories
    const testDir = path.join(fixturesDir, testDirEnt.name);

    const testFilesEnt = fs
      .readdirSync(testDir, {
        encoding: 'utf8',
        withFileTypes: true,
      })
      .filter(
        testFile => testFile.isFile() && testFile.name.endsWith('.json'),
      );

    for (const testFileEnt of testFilesEnt) {
      // testFile is a JSON file
      const testFile = path.join(testDir, testFileEnt.name);
      const rawTestData = fs.readJSONSync(testFile, {
        encoding: 'utf8',
      });
      if (!Array.isArray(rawTestData.expectValues)) {
        rawTestData.expectValues = [[rawTestData.expectValues]];
      }
      const testData: Partial<TestData> = rawTestData;

      const inputFiles =
        testData.inputFiles === undefined
          ? [testFile.replace(/\.json$/, '.js')]
          : testData.inputFiles.map(p =>
              path.join(testDir, p.replace('/', path.sep)),
            );

      const extractionDir = path.join(
        testDir,
        '.extracted',
        testFileEnt.name.replace(/\.json$/, ''),
      );
      const outputPath =
        testData.pluginOptions && testData.pluginOptions.outputPath
          ? path.join(extractionDir, testData.pluginOptions.outputPath)
          : path.join(extractionDir, 'translations.{{ns}}.{{locale}}.json');

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
      };
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readExtractedFile(outputPath: string, opts?: ExpectKeysOpts): any {
  const ns = (opts && opts.ns) || 'translation';
  const locale = (opts && opts.locale) || 'en';

  const realOutputPath = outputPath
    .replace('{{ns}}', ns)
    .replace('{{locale}}', locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extracted: any;
  try {
    extracted = fs.readJSONSync(realOutputPath, { encoding: 'utf8' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      expect(
        true,
        `Couldn't find a JSON file to read at ${realOutputPath}. This probably means the ` +
          `extraction didn't work out.`,
      ).toEqual(false);
    }
    throw err;
  }
  return extracted;
}

function assertHasExpectedValues(testData: TestData): void {
  for (const [expected, opts] of testData.expectValues) {
    const extracted = readExtractedFile(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      testData.pluginOptions.outputPath!,
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
        // Run extraction
        for (const jsFilePath of testData.inputFiles) {
          const transformResult = BabelCore.transformFileSync(jsFilePath, {
            plugins: [[plugin, testData.pluginOptions]],
          });
          expect(
            transformResult && transformResult.code,
            `Babel transformation failed.`,
          ).toBeTruthy();
        }

        assertHasExpectedValues(testData);
      });
    });
  }
}
