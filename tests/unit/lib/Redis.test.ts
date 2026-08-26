import { describe, test, expect, beforeEach, beforeAll } from 'bun:test';
import { resetNatives } from '../../setup';

type Call = { method: string; args: unknown[] };

const calls: Call[] = [];
let reply: unknown = 'REPLY';
let failure: unknown;

let redisfx: any;

beforeAll(async () => {
  resetNatives();

  // lib/Redis.ts talks to the resource purely through `global.exports.redisfx`, so a recording
  // stand-in is enough to observe exactly what crosses the export boundary.
  const stub = new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === 'isReady') return () => true;
        if (method === 'awaitConnection') return async () => true;

        return (...args: unknown[]) => {
          // the wrapper always appends (callback, invokingResource, isPromise)
          const isPromise = args.at(-1);
          const invokingResource = args.at(-2);
          const cb = args.at(-3) as Function;

          calls.push({ method, args: args.slice(0, -3) });

          expect(invokingResource).toBe('redisfx');
          expect(isPromise).toBe(true);

          if (failure) return cb(null, failure);
          return cb(reply);
        };
      },
    },
  );

  (globalThis as any).global.exports = Object.assign((globalThis as any).global.exports, { redisfx: stub });

  ({ redisfx } = await import('../../../lib/Redis.ts'));
});

beforeEach(() => {
  calls.length = 0;
  reply = 'REPLY';
  failure = undefined;
});

describe('argument passing', () => {
  test('forwards positional arguments in order', async () => {
    await redisfx.hset('h', 'field', 'value');
    expect(calls[0]).toEqual({ method: 'hset', args: ['h', 'field', 'value'] });
  });

  test('always passes the options slot so the export arity stays fixed', async () => {
    await redisfx.set('k', 'v');
    expect(calls[0]).toEqual({ method: 'set', args: ['k', 'v', undefined] });
  });

  test('forwards a real options object untouched', async () => {
    await redisfx.set('k', 'v', { EX: 60 });
    expect(calls[0]).toEqual({ method: 'set', args: ['k', 'v', { EX: 60 }] });
  });
});

describe('safeArgs callback shifting', () => {
  test('a callback in the options slot is invoked and never sent as options', async () => {
    // Regression: safeArgs used to inspect the wrong slot, so this callback was silently dropped
    // and the function object was forwarded as if it were an options bag.
    const seen: unknown[] = [];
    await redisfx.set('k', 'v', (result: unknown) => seen.push(result));

    expect(calls[0].args).toEqual(['k', 'v', undefined]);
    expect(seen).toEqual(['REPLY']);
  });

  test('the same shift applies to zadd, scan, getex and subscribe', async () => {
    const seen: unknown[] = [];
    const cb = (r: unknown) => seen.push(r);

    await redisfx.zadd('z', 1, 'm', cb);
    await redisfx.scan(0, cb);
    await redisfx.getex('k', cb);
    await redisfx.subscribe('chan', cb);

    expect(calls[0].args).toEqual(['z', 1, 'm', undefined]);
    expect(calls[1].args).toEqual([0, undefined]);
    expect(calls[2].args).toEqual(['k', undefined]);
    expect(calls[3].args).toEqual(['chan', undefined]);
    expect(seen).toEqual(['REPLY', 'REPLY', 'REPLY', 'REPLY']);
  });

  test('an explicit callback still wins over the options slot', async () => {
    const seen: unknown[] = [];
    await redisfx.set('k', 'v', { EX: 5 }, (r: unknown) => seen.push(r));

    expect(calls[0].args).toEqual(['k', 'v', { EX: 5 }]);
    expect(seen).toEqual(['REPLY']);
  });

  test('srandmember forwards a numeric count but shifts a callback', async () => {
    await redisfx.srandmember('s', 3);
    expect(calls[0].args).toEqual(['s', 3]);

    calls.length = 0;
    const seen: unknown[] = [];
    await redisfx.srandmember('s', (r: unknown) => seen.push(r));

    expect(calls[0].args).toEqual(['s', undefined]);
    expect(seen).toEqual(['REPLY']);
  });

  test('rejects a non-function callback rather than passing it through', async () => {
    expect(() => redisfx.set('k', 'v', { EX: 5 }, 'nope' as any)).toThrow(TypeError);
  });
});

describe('results and errors', () => {
  test('resolves with the reply when no callback is given', async () => {
    reply = { a: 1 };
    await expect(redisfx.hgetall('h')).resolves.toEqual({ a: 1 });
  });

  test('rejects when the resource reports an error', async () => {
    failure = 'ERR bad command';
    await expect(redisfx.get('k')).rejects.toBe('ERR bad command');
  });
});

describe('connection helpers', () => {
  test('isReady delegates straight to the export', () => {
    expect(redisfx.isReady()).toBe(true);
  });

  test('awaitConnection resolves', async () => {
    await expect(redisfx.awaitConnection()).resolves.toBe(true);
  });

  test('ready fires once the resource is started', async () => {
    await new Promise<void>((resolve) => redisfx.ready(() => resolve()));
  });
});

describe('every wrapper maps to an identically named export', () => {
  // Guards against a typo in the wrapper body silently calling the wrong export, and exercises
  // each method body once. Called with no arguments: every parameter is optional at runtime and
  // the wrapper still has to forward the right export name.
  const skip = new Set(['isReady', 'awaitConnection', 'ready']);

  test('covers the whole surface', async () => {
    const methods = Object.keys(redisfx).filter((name) => !skip.has(name));
    expect(methods.length).toBeGreaterThan(120);

    for (const method of methods) {
      calls.length = 0;
      await (redisfx as any)[method]();

      expect(calls).toHaveLength(1);
      // hmset intentionally targets the same export name; everything else is 1:1
      expect(calls[0].method).toBe(method);
    }
  });
});

describe('raw', () => {
  test('defaults the argument list to empty', async () => {
    await redisfx.raw('PING');
    expect(calls[0]).toEqual({ method: 'raw', args: ['PING', []] });
  });

  test('forwards an explicit argument list', async () => {
    await redisfx.raw('SET', ['k', 'v']);
    expect(calls[0]).toEqual({ method: 'raw', args: ['SET', ['k', 'v']] });
  });

  test('shifts a callback out of the args slot', async () => {
    const seen: unknown[] = [];
    await redisfx.raw('PING', (r: unknown) => seen.push(r));

    expect(calls[0]).toEqual({ method: 'raw', args: ['PING', []] });
    expect(seen).toEqual(['REPLY']);
  });
});
