import { parseConfig } from '../../src/config';
import jsonv3Exporter from '../../src/exporters/jsonv3';
import { createSimpleKey } from './helpers';
import { ConflictError } from '../../src/exporters';

describe('Test JSONv3 exporter', () => {
  const config = parseConfig({ jsonSpace: 0 });

  it('can init', () => {
    expect(jsonv3Exporter.init({ config })).toEqual({});
  });

  it('can parse', () => {
    expect(
      jsonv3Exporter.parse({
        config,
        content: '{"hello": "world"}',
      }),
    ).toEqual({ hello: 'world' });
  });

  it('can stringify', () => {
    expect(
      jsonv3Exporter.stringify({
        config,
        file: { hello: 'world' },
      }),
    ).toEqual('{"hello":"world"}');
  });

  it('can stringify with custom spacing', () => {
    const config = parseConfig({ jsonSpace: 2 });
    expect(
      jsonv3Exporter.stringify({
        config,
        file: { hello: 'world' },
      }),
    ).toEqual('{\n  "hello": "world"\n}');
  });

  it('can get simple key', () => {
    expect(
      jsonv3Exporter.getKey({
        config,
        keyPath: [],
        cleanKey: 'hello',
        file: { hello: 'world' },
      }),
    ).toEqual('world');
  });

  it('can get nested keys', () => {
    expect(
      jsonv3Exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'new',
        file: { hello: { new: 'world' } },
      }),
    ).toEqual('world');
  });

  it('can get undefined key', () => {
    expect(
      jsonv3Exporter.getKey({
        config,
        keyPath: ['what'],
        cleanKey: 'new',
        file: { hello: { notSoNew: 'world' } },
      }),
    ).toBeUndefined();
  });

  it('cannot get conflicting key', () => {
    expect(() =>
      jsonv3Exporter.getKey({
        config,
        keyPath: [],
        cleanKey: 'hello',
        file: { hello: { new: 'world' } },
      }),
    ).toThrow(ConflictError);

    expect(() =>
      jsonv3Exporter.getKey({
        config,
        keyPath: ['hello'],
        cleanKey: 'world',
        file: { hello: null },
      }),
    ).toThrow(ConflictError);
  });

  it('can add key', () => {
    expect(
      jsonv3Exporter.addKey({
        config,
        file: {},
        key: createSimpleKey('hello'),
        value: 'world',
      }),
    ).toEqual({ hello: 'world' });
  });

  it('can add deep key', () => {
    expect(
      jsonv3Exporter.addKey({
        config,
        file: {},
        key: createSimpleKey('new', ['hello', 'brave']),
        value: 'world',
      }),
    ).toEqual({ hello: { brave: { new: 'world' } } });
  });

  it('cannot add key in case of conflict', () => {
    expect(() =>
      jsonv3Exporter.addKey({
        config,
        file: { hello: { brave: 'world' } },
        key: createSimpleKey('new', ['hello', 'brave']),
        value: 'world',
      }),
    ).toThrow(ConflictError);
  });
});
