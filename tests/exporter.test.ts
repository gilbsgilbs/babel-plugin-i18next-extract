import fs from 'fs-extra';
import path from 'path';
import { sync as rimraf } from 'rimraf';

import exportTranslationKeys, { ExportError } from '../src/exporter';
import { parseConfig } from '../src/config';
import { TranslationKey } from '../src/keys';

function createSimpleKey(key: string, keyPath: string[] = []): TranslationKey {
  return {
    key,
    keyPath,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodePath: {} as any,
    isDerivedKey: false,
    parsedOptions: {
      contexts: false,
      hasCount: false,
      ns: null,
    },
    cleanKey: 'key0',
    ns: 'translation',
  };
}

describe('Test exporter works', () => {
  const outputDir = path.join(__dirname, 'exporter', '.extracted');
  rimraf(outputDir);

  it('can export simple key', () => {
    const outputPath = path.join(outputDir, 'simple.json');
    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config);
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: '' });
  });

  it('does not overwrite existing values', () => {
    const outputPath = path.join(outputDir, 'not_overwrite.json');
    fs.writeJSONSync(outputPath, { key0: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config);
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: 'has value' });
  });

  it('can export deep keys', () => {
    const outputPath = path.join(outputDir, 'deep.json');
    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0', ['deep']);
    exportTranslationKeys([key], 'fr', config);
    expect(fs.readJSONSync(outputPath)).toEqual({ deep: { key0: '' } });
  });

  it('throws an ExportError if it cannot merge', () => {
    const outputPath = path.join(outputDir, 'throws_if_cannot_merge.json');
    fs.writeJSONSync(outputPath, { deep: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key', ['deep']);

    let hasThrown = false;
    try {
      exportTranslationKeys([key], 'fr', config);
    } catch (err) {
      if (!(err instanceof ExportError)) throw err;
      hasThrown = true;
    }

    expect(
      hasThrown,
      'Expected ExportError, but no exception was thrown',
    ).toBe(true);
    expect(fs.readJSONSync(outputPath)).toEqual({ deep: 'has value' });
  });
});
