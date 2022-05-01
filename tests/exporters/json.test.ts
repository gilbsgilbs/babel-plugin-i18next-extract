import { parseConfig } from '../../src/config';
import { ConflictError } from '../../src/exporters';
import exporter from '../../src/exporters/json';
import { createTranslationKey } from '../helpers';

describe('Test JSON exporter', () => {
  const config = parseConfig({ jsonSpace: 0 });

  it('can init', () => {
    expect(exporter.init({ config })).toEqual({
      whitespacesBefore: '',
      whitespacesAfter: '\n',
      content: {},
    });
  });

  it('can parse', () => {
    expect(
      exporter.parse({
        config,
        content: '\n\n\t\r\n  {"hello": "world"}\n\t  \r\n',
      }),
    ).toEqual({
      whitespacesBefore: '\n\n\t\r\n  ',
      whitespacesAfter: '\n\t  \r\n',
      content: { hello: 'world' },
    });
  });

  it('can stringify', () => {
    expect(
      exporter.stringify({
        config,
        file: {
          whitespacesBefore: '\n\n\t\r\n  ',
          whitespacesAfter: '\n\t  \r\n',
          content: { hello: 'world' },
        },
      }),
    ).toEqual('\n\n\t\r\n  {"hello":"world"}\n\t  \r\n');
  });

  it('can stringify with custom spacing', () => {
    const config = parseConfig({ jsonSpace: 2 });
    expect(
      exporter.stringify({
        config,
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: 'world' },
        },
      }),
    ).toEqual('{\n  "hello": "world"\n}');
  });

  it('can get simple key', () => {
    expect(
      exporter.getKey({
        config,
        keyPath: [],
        cleanKey: 'hello',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: 'world' },
        },
      }),
    ).toEqual('world');
  });

  it('can get nested keys', () => {
    expect(
      exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'new',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: { new: 'world' } },
        },
      }),
    ).toEqual('world');
  });

  it('can get undefined key', () => {
    expect(
      exporter.getKey({
        config,
        keyPath: ['what'],
        cleanKey: 'new',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: { notSoNew: 'world' } },
        },
      }),
    ).toBeUndefined();
  });

  it('throws ConflictError when path contains non JSON object', () => {
    expect(() =>
      exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'world',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: 250 },
        },
      }),
    ).toThrow(ConflictError);

    expect(() =>
      exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'world',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: [] },
        },
      }),
    ).toThrow(ConflictError);
  });

  it('cannot get conflicting key', () => {
    expect(() =>
      exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'world',
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: null },
        },
      }),
    ).toThrow(ConflictError);
  });

  it('can add key', () => {
    expect(
      exporter.addKey({
        config,
        file: { whitespacesBefore: '', whitespacesAfter: '', content: {} },
        key: createTranslationKey('hello'),
        value: 'world',
      }).content,
    ).toEqual({ hello: 'world' });
  });

  it('can add deep key', () => {
    expect(
      exporter.addKey({
        config,
        file: { whitespacesBefore: '', whitespacesAfter: '', content: {} },
        key: createTranslationKey('new', ['hello', 'brave']),
        value: 'world',
      }).content,
    ).toEqual({ hello: { brave: { new: 'world' } } });
  });

  it('cannot add key in case of conflict', () => {
    expect(() =>
      exporter.addKey({
        config,
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: { brave: 'world' } },
        },
        key: createTranslationKey('new', ['hello', 'brave']),
        value: 'world',
      }),
    ).toThrow(ConflictError);
  });
});
