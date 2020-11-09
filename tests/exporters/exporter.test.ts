import path from 'path';

import fs from 'fs-extra';
import { sync as rimraf } from 'rimraf';

import { parseConfig } from '../../src/config';
import exportTranslationKeys, {
  ExportError,
  createExporterCache,
} from '../../src/exporters';
import { createTranslationKey } from '../helpers';

describe('Test exporter works', () => {
  const outputDir = path.join(__dirname, '.exporter.extracted');
  rimraf(outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  it('can export simple key', () => {
    const outputPath = path.join(outputDir, 'simple.json');
    const config = parseConfig({ outputPath });
    const key = createTranslationKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: '' });
  });

  it('does not overwrite existing values', () => {
    const outputPath = path.join(outputDir, 'not_overwrite.json');
    fs.writeJSONSync(outputPath, { key0: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createTranslationKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: 'has value' });
  });

  it('can export deep keys', () => {
    const outputPath = path.join(outputDir, 'deep.json');
    const config = parseConfig({ outputPath });
    const key = createTranslationKey('key0', ['deep']);
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ deep: { key0: '' } });
  });

  it('throws an ExportError if it cannot merge', () => {
    const outputPath = path.join(outputDir, 'throws_if_cannot_merge.json');
    fs.writeJSONSync(outputPath, { deep: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createTranslationKey('key', ['deep']);

    let hasThrown = false;
    try {
      exportTranslationKeys([key], 'fr', config, createExporterCache());
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

  it('can discard old keys', () => {
    const outputPath = path.join(outputDir, 'discard_old_keys.json');
    fs.writeJSONSync(outputPath, { oldKey: 'foo' });

    const config = parseConfig({ outputPath, discardOldKeys: true });
    const key = createTranslationKey('newKey');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ newKey: '' });
  });

  it('can discard old keys across runs', () => {
    const outputPath = path.join(outputDir, 'discard_old_keys.json');
    fs.writeJSONSync(outputPath, { oldKey: 'foo', newKey: 'with value' });

    const config = parseConfig({ outputPath, discardOldKeys: true });
    const key0 = createTranslationKey('newKey');
    const key1 = createTranslationKey('newKey2');
    const cache = createExporterCache();
    exportTranslationKeys([key0], 'fr', config, cache);
    exportTranslationKeys([key1], 'fr', config, cache);
    expect(fs.readJSONSync(outputPath)).toEqual({
      newKey: 'with value',
      newKey2: '',
    });
  });

  it('reload translation file and merge with actual cache', () => {
    const outputPath = path.join(outputDir, 'if_locale_file_changes.json');
    fs.writeJSONSync(outputPath, { presentAtInit: 'foo' });

    const config = parseConfig({ outputPath });
    const cache = createExporterCache();

    // view key
    const key0 = createTranslationKey('presentAtInit');

    // extract at init
    exportTranslationKeys([key0], 'fr', config, cache);

    expect(fs.readJSONSync(outputPath)).toEqual({
      presentAtInit: 'foo',
    });

    // update the locale file directly
    fs.writeJSONSync(outputPath, {
      presentAtInit: 'foo updated directly in file after init',
    });

    // view key
    const key1 = createTranslationKey('newKeyAfterInit');

    // extract second time
    exportTranslationKeys([key0, key1], 'fr', config, cache);

    // the locale file should have disk changes + new view key (newKeyAfterInit)
    expect(fs.readJSONSync(outputPath)).toEqual({
      presentAtInit: 'foo updated directly in file after init',
      newKeyAfterInit: '',
    });
  });
});
