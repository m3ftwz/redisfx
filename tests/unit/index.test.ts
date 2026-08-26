import { describe, test, expect, beforeAll, beforeEach } from 'bun:test';
import { databaseCalls, pubsubCalls, resetMocks } from '../helpers/mocks';
import { resetNatives, getExport, getExportNames, getEventHandlers } from '../setup';

const calls = databaseCalls.commands;
const multiCalls = databaseCalls.multi;

beforeAll(async () => {
  resetNatives();
  await import('../../src/index.ts');
});

beforeEach(() => {
  resetMocks();
});

describe('export registration', () => {
  test('registers a direct, _async and Sync export for every command', () => {
    const names = getExportNames();

    for (const base of ['get', 'set', 'del', 'hgetall', 'zadd', 'multi', 'raw', 'subscribe']) {
      expect(names).toContain(base);
      expect(names).toContain(`${base}_async`);
      expect(names).toContain(`${base}Sync`);
    }
  });

  test('exposes the commands added for modern Redis versions', () => {
    const names = getExportNames();

    for (const command of [
      'hexpire',
      'httl',
      'hpersist',
      'hgetex',
      'hgetdel', // Redis 7.4 / 8.0 hash TTL
      'getdel',
      'getex',
      'copy', // Redis 6.2
      'smismember',
      'sintercard',
      'zintercard',
      'lmpop',
      'zmpop_absent_ok', // Redis 6.2/7.0
      'publish',
      'spublish',
      'subscribe',
      'unsubscribe',
      'eval',
      'evalsha',
      'fcall',
      'xadd',
      'xlen',
      'pfadd',
      'bitcount',
    ].filter((c) => c !== 'zmpop_absent_ok')) {
      expect(names).toContain(command);
    }
  });
});

describe('direct call form', () => {
  test('forwards arguments and the callback in declaration order', async () => {
    await getExport('get')('key', () => {}, 'caller', true);

    expect(calls[0]).toMatchObject({ command: 'GET', args: ['key'], invokingResource: 'caller', isPromise: true });
  });

  test('normalises a scalar into the variadic list Redis expects', async () => {
    await getExport('del')('one');
    expect(calls[0].args).toEqual([['one']]);

    calls.length = 0;
    await getExport('del')(['a', 'b']);
    expect(calls[0].args).toEqual([['a', 'b']]);
  });

  test('appends an options object only when it is really an object', async () => {
    await getExport('set')('k', 'v', { EX: 60 });
    expect(calls[0].args).toEqual(['k', 'v', { EX: 60 }]);

    calls.length = 0;
    await getExport('set')('k', 'v');
    expect(calls[0].args).toEqual(['k', 'v']);
  });

  test('accepts a callback passed in the options slot', async () => {
    const seen: unknown[] = [];
    await getExport('set')('k', 'v', (r: unknown) => seen.push(r));

    expect(calls[0].args).toEqual(['k', 'v']);
    expect(calls[0].cb).toBeFunction();
    expect(seen).toEqual(['RESULT']);
  });

  test('scan stringifies the cursor - node-redis rejects a numeric one', async () => {
    await getExport('scan')(0);
    expect(calls[0].args).toEqual(['0']);

    calls.length = 0;
    await getExport('scan')(12, { MATCH: 'a*' });
    expect(calls[0].args).toEqual(['12', { MATCH: 'a*' }]);
  });

  test('srandmember switches command based on whether a count was given', async () => {
    await getExport('srandmember')('k');
    expect(calls[0].command).toBe('SRANDMEMBER');

    calls.length = 0;
    await getExport('srandmember')('k', 3);
    expect(calls[0]).toMatchObject({ command: 'SRANDMEMBERCOUNT', args: ['k', 3] });
  });

  test('zadd builds the scored-member object node-redis expects', async () => {
    await getExport('zadd')('z', 1.5, 'member');
    expect(calls[0].args).toEqual(['z', { score: 1.5, value: 'member' }]);
  });

  test('raw uppercases the command and takes the raw dispatch path', async () => {
    await getExport('raw')('get', ['key']);
    expect(calls[0]).toMatchObject({ command: 'GET', args: ['key'], raw: true });
  });

  test('raw tolerates a missing argument list', async () => {
    await getExport('raw')('ping');
    expect(calls[0].args).toEqual([]);
  });
});

describe('_async wrapper argument alignment', () => {
  test('pads an omitted trailing option so the resource and promise flag stay aligned', async () => {
    await getExport('set_async')('k', 'v');

    // Without padding, the resolver would land in the options slot and 'test-resource' in cb.
    expect(calls[0].args).toEqual(['k', 'v']);
    expect(calls[0].invokingResource).toBe('test-resource');
    expect(calls[0].isPromise).toBe(true);
    expect(calls[0].cb).toBeFunction();
  });

  test('keeps alignment when the optional argument is supplied', async () => {
    await getExport('set_async')('k', 'v', { EX: 30 });

    expect(calls[0].args).toEqual(['k', 'v', { EX: 30 }]);
    expect(calls[0].invokingResource).toBe('test-resource');
    expect(calls[0].isPromise).toBe(true);
  });

  test('aligns a zero-argument command', async () => {
    await getExport('ping_async')();

    expect(calls[0]).toMatchObject({ command: 'PING', args: [], invokingResource: 'test-resource', isPromise: true });
  });

  test('aligns commands that take every argument', async () => {
    await getExport('hset_async')('h', 'f', 'v');

    expect(calls[0]).toMatchObject({ command: 'HSET', args: ['h', 'f', 'v'], isPromise: true });
  });

  test('drops extra arguments rather than pushing the callback out of position', async () => {
    await getExport('get_async')('key', 'unexpected', 'extra');

    expect(calls[0].args).toEqual(['key']);
    expect(calls[0].invokingResource).toBe('test-resource');
    expect(calls[0].isPromise).toBe(true);
  });

  test('resolves with the command result', async () => {
    databaseCalls.result = 42;
    await expect(getExport('get_async')('key')).resolves.toBe(42);
  });

  test('rejects when the command reports an error', async () => {
    databaseCalls.failure = 'ERR something failed';
    await expect(getExport('get_async')('key')).rejects.toThrow('ERR something failed');
  });

  test('Sync is an alias of _async', () => {
    expect(getExport('getSync')).toBe(getExport('get_async'));
  });
});

describe('connection helpers', () => {
  // `client` is a live ESM binding in the real bundle; mock.module cannot reproduce that, so this
  // only asserts the coerced-boolean contract rather than toggling the connection.
  test('isReady returns a boolean rather than the client object', () => {
    const value = getExport('isReady')();
    expect(typeof value).toBe('boolean');
    expect(value).toBe(true);
  });

  test('isReady_async is the plain function, not a promise that never settles', () => {
    expect(getExport('isReady_async')).toBe(getExport('isReady'));
    expect(getExport('isReadySync')).toBe(getExport('isReady'));
    expect(getExport('isReady_async')()).toBe(true);
  });

  test('awaitConnection resolves once a client exists', async () => {
    await expect(getExport('awaitConnection')()).resolves.toBe(true);
    expect(getExport('awaitConnection_async')).toBe(getExport('awaitConnection'));
  });
});

describe('multi and pub/sub', () => {
  test('multi forwards the command list untouched', async () => {
    const commands = [{ command: 'SET', args: ['k', 'v'] }];
    await getExport('multi')(commands);

    expect(multiCalls[0].commands).toBe(commands);
  });

  test('subscribe normalises a scalar channel and defaults the options', async () => {
    await getExport('subscribe')('chan');

    expect(pubsubCalls.entries[0][1]).toBe('test-resource');
    expect(pubsubCalls.entries[0][2]).toEqual(['chan']);
    expect(pubsubCalls.entries[0][3]).toEqual({});
  });

  test('subscribe forwards pattern mode', async () => {
    await getExport('subscribe')(['a*', 'b*'], { pattern: true });

    expect(pubsubCalls.entries[0][2]).toEqual(['a*', 'b*']);
    expect(pubsubCalls.entries[0][3]).toEqual({ pattern: true });
  });

  test('a callback in the options slot is not mistaken for options', async () => {
    const seen: unknown[] = [];
    await getExport('unsubscribe')('chan', (r: unknown) => seen.push(r));

    expect(pubsubCalls.entries[0][3]).toEqual({});
    expect(seen).toEqual([true]);
  });
});

describe('resource lifecycle', () => {
  test('tears the subscriber down when the resource itself stops', () => {
    const handlers = getEventHandlers('onResourceStop');
    expect(handlers.length).toBeGreaterThan(0);

    for (const handler of handlers) handler('some-other-resource');
    expect(pubsubCalls.entries).toHaveLength(0);

    for (const handler of handlers) handler('redisfx');
    expect(pubsubCalls.entries).toEqual([['close']]);
  });
});
