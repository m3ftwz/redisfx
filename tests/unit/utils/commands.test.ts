import { describe, test, expect } from 'bun:test';
import { COMMAND_MAP, resolveCommand, serializeArgs } from 'utils/commands';

describe('resolveCommand', () => {
  test('passes an unmapped command through unchanged', () => {
    expect(resolveCommand('GET')).toBe('GET');
    expect(resolveCommand('HGETDEL')).toBe('HGETDEL');
  });

  test('maps modifier-specific commands to their node-redis method name', () => {
    expect(resolveCommand('ZRANGEWITHSCORES')).toBe('ZRANGE_WITHSCORES');
    expect(resolveCommand('SRANDMEMBERCOUNT')).toBe('SRANDMEMBER_COUNT');
    expect(resolveCommand('OBJECTENCODING')).toBe('OBJECT_ENCODING');
  });

  test('every mapped target differs from its key, so no entry is a no-op', () => {
    for (const [key, value] of Object.entries(COMMAND_MAP)) expect(value).not.toBe(key);
  });
});

describe('serializeArgs', () => {
  test('stringifies scalars', () => {
    expect(serializeArgs(['GET', 'key'])).toEqual(['GET', 'key']);
    expect(serializeArgs(['EXPIRE', 'key', 100])).toEqual(['EXPIRE', 'key', '100']);
    expect(serializeArgs(['SET', 'key', true])).toEqual(['SET', 'key', 'true']);
  });

  test('flattens nested arrays into variadic arguments rather than encoding them as JSON', () => {
    expect(serializeArgs(['DEL', ['a', 'b']])).toEqual(['DEL', 'a', 'b']);
    expect(serializeArgs(['SADD', 'k', ['x', ['y', 'z']]])).toEqual(['SADD', 'k', 'x', 'y', 'z']);
  });

  test('encodes plain objects as JSON so they can be stored as values', () => {
    expect(serializeArgs(['SET', 'k', { a: 1 }])).toEqual(['SET', 'k', '{"a":1}']);
  });

  test('encodes dates as ISO strings', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');
    expect(serializeArgs(['SET', 'k', date])).toEqual(['SET', 'k', '2026-01-02T03:04:05.000Z']);
  });

  test('passes buffers through untouched - node-redis accepts them on the wire', () => {
    const buf = Buffer.from('hi');
    const [, value] = serializeArgs(['SET', buf]);
    expect(value).toBe(buf as any);
  });

  test('rejects null and undefined instead of silently sending an empty string', () => {
    expect(() => serializeArgs(['SET', 'k', null])).toThrow(TypeError);
    expect(() => serializeArgs(['SET', 'k', undefined])).toThrow(TypeError);
    expect(() => serializeArgs(['SET', 'k', ['a', null]])).toThrow(TypeError);
  });

  test('an empty argument list stays empty', () => {
    expect(serializeArgs([])).toEqual([]);
  });
});
