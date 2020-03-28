import { parseConfig } from '../../src/config';
import { ConflictError } from '../../src/exporters';
import jsonv3Exporter from '../../src/exporters/jsonv3';

import { createSimpleKey } from './helpers';

describe('Test JSONv3 exporter', () => {
  const config = parseConfig({ jsonSpace: 0 });

  it('can init', () => {
    expect(jsonv3Exporter.init({ config })).toEqual({
      whitespacesBefore: '',
      whitespacesAfter: '\n',
      content: {},
    });
  });

  it('can parse', () => {
    expect(
      jsonv3Exporter.parse({
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
      jsonv3Exporter.stringify({
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
      jsonv3Exporter.stringify({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.getKey({
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
      jsonv3Exporter.addKey({
        config,
        file: { whitespacesBefore: '', whitespacesAfter: '', content: {} },
        key: createSimpleKey('hello'),
        value: 'world',
      }).content,
    ).toEqual({ hello: 'world' });
  });

  it('can add deep key', () => {
    expect(
      jsonv3Exporter.addKey({
        config,
        file: { whitespacesBefore: '', whitespacesAfter: '', content: {} },
        key: createSimpleKey('new', ['hello', 'brave']),
        value: 'world',
      }).content,
    ).toEqual({ hello: { brave: { new: 'world' } } });
  });

  it('cannot add key in case of conflict', () => {
    expect(() =>
      jsonv3Exporter.addKey({
        config,
        file: {
          whitespacesBefore: '',
          whitespacesAfter: '',
          content: { hello: { brave: 'world' } },
        },
        key: createSimpleKey('new', ['hello', 'brave']),
        value: 'world',
      }),
    ).toThrow(ConflictError);
  });
});
