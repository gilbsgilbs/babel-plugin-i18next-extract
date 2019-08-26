import fs from 'fs-extra';
import path from 'path';
import { sync as rimraf } from 'rimraf';

import exportTranslationKeys, {
  ExportError,
  createExporterCache,
} from '../../src/exporters';
import { parseConfig } from '../../src/config';
import { createSimpleKey } from './helpers';

describe('Test exporter works', () => {
  const outputDir = path.join(__dirname, '.exporter.extracted');
  rimraf(outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  it('can export simple key', () => {
    const outputPath = path.join(outputDir, 'simple.json');
    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: '' });
  });

  it('does not overwrite existing values', () => {
    const outputPath = path.join(outputDir, 'not_overwrite.json');
    fs.writeJSONSync(outputPath, { key0: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: 'has value' });
  });

  it('can export deep keys', () => {
    const outputPath = path.join(outputDir, 'deep.json');
    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0', ['deep']);
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ deep: { key0: '' } });
  });

  it('throws an ExportError if it cannot merge', () => {
    const outputPath = path.join(outputDir, 'throws_if_cannot_merge.json');
    fs.writeJSONSync(outputPath, { deep: 'has value' });

    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key', ['deep']);

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

  it('throws an ExportError when the value is already an object', () => {
    const outputPath = path.join(
      outputDir,
      'throws_if_already_an_object.json',
    );
    fs.writeJSONSync(outputPath, { alreadyDeep: { someKey: 'foo' } });

    const config = parseConfig({ outputPath });
    const key = createSimpleKey('alreadyDeep');

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
    expect(fs.readJSONSync(outputPath)).toEqual({
      alreadyDeep: { someKey: 'foo' },
    });
  });

  it('can discard old keys', () => {
    const outputPath = path.join(outputDir, 'discard_old_keys.json');
    fs.writeJSONSync(outputPath, { oldKey: 'foo' });

    const config = parseConfig({ outputPath, discardOldKeys: true });
    const key = createSimpleKey('newKey');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    expect(fs.readJSONSync(outputPath)).toEqual({ newKey: '' });
  });

  it('can discard old keys across runs', () => {
    const outputPath = path.join(outputDir, 'discard_old_keys.json');
    fs.writeJSONSync(outputPath, { oldKey: 'foo', newKey: 'with value' });

    const config = parseConfig({ outputPath, discardOldKeys: true });
    const key0 = createSimpleKey('newKey');
    const key1 = createSimpleKey('newKey2');
    const cache = createExporterCache();
    exportTranslationKeys([key0], 'fr', config, cache);
    exportTranslationKeys([key1], 'fr', config, cache);
    expect(fs.readJSONSync(outputPath)).toEqual({
      newKey: 'with value',
      newKey2: '',
    });
  });

  it('wont include a new line character at the end of the file by default', () => {
    const outputPath = path.join(outputDir, 'new_line_at_end.json');
    const config = parseConfig({ outputPath });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    const output = fs.readFileSync(outputPath, { encoding: 'utf-8' });
    expect(output.charAt(output.length - 1)).toEqual('}');
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: '' });
  });

  it('can include a new line character at the end of the exported file', () => {
    const outputPath = path.join(outputDir, 'new_line_at_end.json');
    const config = parseConfig({ outputPath, appendNewLineAtEndOfFile: true });
    const key = createSimpleKey('key0');
    exportTranslationKeys([key], 'fr', config, createExporterCache());
    const output = fs.readFileSync(outputPath, { encoding: 'utf-8' });
    expect(output.charAt(output.length - 1)).toEqual('\n');
    expect(fs.readJSONSync(outputPath)).toEqual({ key0: '' });
  });
});
