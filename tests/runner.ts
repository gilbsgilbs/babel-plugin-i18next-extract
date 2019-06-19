import fs from 'fs-extra';
import path from 'path';
import { Config } from '../src/config';
import * as BabelCore from '@babel/core';
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

  // list of [["key", "path"], "value", {ns: 'namespace', 'locale': 'fr'}]
  expectValues: [string[], string, ExpectKeysOpts?][];

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
      const testData = fs.readJSONSync(testFile, {
        encoding: 'utf8',
      }) as Partial<TestData>;

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

      try {
        fs.removeSync(extractionDir);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }

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

type ReadKeyPathType = (
  keyPath: string[],
  opts?: ExpectKeysOpts,
) => string | number | null | undefined;
type CountKeysType = (opts?: ExpectKeysOpts) => number;

/**
 * Cached reading of extracted files.
 * e.g.
 *
 * cachedReader('translations/{{ns}}/{{locale}}.json', (readKeyPath, countKeys) => {
 *   const keyVal = readKeyPath(['some', 'key', 'path'], {ns: 'namespace', locale: 'fr'});
 *   const countKeys = countKeys({ns: 'namespace', locale: 'fr'});
 * })
 */
function cachedReader<T>(
  outputPath: string,
  cb: (readKeyPath: ReadKeyPathType, countKeys: CountKeysType) => T,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache: { [key: string]: any } = {};
  const cacheKeySep = '\0';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readOutput = (opts?: ExpectKeysOpts): any => {
    const ns = (opts && opts.ns) || 'translation';
    const locale = (opts && opts.locale) || 'en';

    const cacheKey = [ns, locale].join(cacheKeySep);
    if (cacheKey in cache) return cache[cacheKey];

    const realOutputPath = outputPath
      .replace('{{ns}}', ns)
      .replace('{{locale}}', locale);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extracted: any;
    try {
      extracted = fs.readJSONSync(realOutputPath, { encoding: 'utf8' });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      cache[cacheKey] = undefined;
      return undefined;
    }
    cache[cacheKey] = extracted;
    return extracted;
  };

  const findKeyPath = (
    keyPath: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
  ): number | string | null | undefined => {
    let obj = data;
    for (const node of keyPath) {
      if (obj !== Object(obj)) return undefined;
      obj = obj[node];
      if (obj === undefined) return obj;
    }
    return obj;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countKeysOnData = (data: any): number => {
    if (Array.isArray(data) || Object(data) !== data) return 1;
    return Object.values(data).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prev: number, curr: any) => prev + countKeysOnData(curr),
      0,
    );
  };

  const countKeys: CountKeysType = opts => {
    return countKeysOnData(readOutput(opts));
  };

  const readKeyPath: ReadKeyPathType = (keyPath, opts) => {
    return findKeyPath(keyPath, readOutput(opts));
  };

  return cb(readKeyPath, countKeys);
}

function testHasExpectedValues(
  testData: TestData,
  readKeyPath: ReadKeyPathType,
  countKeys: CountKeysType,
): void {
  it(`should have all expected values`, () => {
    for (const [keyPath, value, opts] of testData.expectValues) {
      const v = readKeyPath(keyPath, opts);
      expect(
        v,
        `Couldn't find keyPath ${keyPath}. opts=${JSON.stringify(opts)}`,
      ).not.toBeUndefined();
      expect(
        v,
        `Unexpected value for keyPath ${keyPath}. opts=${JSON.stringify(
          opts,
        )}`,
      ).toEqual(value);
    }
    const numberOfExtractedKeys = countKeys();
    expect(
      numberOfExtractedKeys,
      `Too many keys were extracted. Please ensure that you put all ` +
        `extracted keys in "expectValues".`,
    ).not.toBeGreaterThan(testData.expectValues.length);
  });
}

/**
 * Run all tests from __fixtures__ folder.
 */
export function runChecks(): void {
  for (const testData of genTestData()) {
    describe(`${testData.testDir}/${path.basename(testData.inputFiles[0])}: ${
      testData.description
    }`, () => {
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

      cachedReader(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        testData.pluginOptions!.outputPath!,
        (readKeyPath, countKeys) => {
          testHasExpectedValues(testData, readKeyPath, countKeys);
        },
      );
    });
  }
}
