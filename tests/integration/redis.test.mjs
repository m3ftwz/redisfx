import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { build } from 'esbuild';

// Run under Node so Bun's process-global Redis mocks cannot mask driver incompatibilities.
// Use a disposable Redis server: these tests create and delete keys under a unique prefix.
const url = process.env.REDIS_TEST_URL;

for (const RESP of [2, 3]) {
  test(`real node-redis driver with RESP${RESP}`, { skip: !url, timeout: 15000 }, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'redisfx-integration-'));
    const exports = {};
    const events = [];
    const handlers = {};
    const intervals = [];
    const prefix = `redisfx:test:${randomUUID()}`;
    const key = (suffix) => `${prefix}:${suffix}`;
    const convars = { redis_connection_string: url, redis_resp: RESP, redis_versioncheck: 0 };
    const originalInterval = globalThis.setInterval;
    const natives = {
      GetConvar: (name, fallback) => String(convars[name] ?? fallback),
      GetConvarInt: (name, fallback) => Number(convars[name] ?? fallback),
      GetCurrentResourceName: () => 'redisfx',
      GetInvokingResource: () => 'integration-test',
      ScheduleResourceTick: () => {},
      RegisterCommand: () => {},
      onNet: () => {},
      on: (event, handler) => (handlers[event] ??= []).push(handler),
      emit: (...args) => events.push(args),
      TriggerEvent: () => {},
      exports: (name, fn) => (exports[name] = fn),
      setInterval: (...args) => {
        const interval = originalInterval(...args);
        intervals.push(interval);
        return interval;
      },
    };
    const originals = Object.fromEntries(Object.keys(natives).map((name) => [name, globalThis[name]]));
    Object.assign(globalThis, natives);
    let runtime;

    try {
      const outfile = join(directory, 'runtime.cjs');
      await build({
        stdin: {
          contents: "import './src/index.ts'; export { client } from './src/database/pool.ts';",
          resolveDir: process.cwd(),
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node22',
        outfile,
      });
      runtime = createRequire(import.meta.url)(outfile);
      while (!exports.isReady()) await delay(10);
      const run = (command, ...args) => exports[`${command}_async`](...args);

      await run('set', key('string'), 'value', { EX: 60 });
      assert.equal(await run('get', key('string')), 'value');
      await run('hset', key('hash'), 'field', 'value');
      assert.deepEqual({ ...(await run('hgetall', key('hash'))) }, { field: 'value' });
      await run('zadd', key('scores'), 1.5, 'member');
      assert.equal(await run('zscore', key('scores'), 'member'), 1.5);
      assert.deepEqual(await run('zrangeWithScores', key('scores'), 0, -1), [{ value: 'member', score: 1.5 }]);
      const scanned = await run('scan', 0, { MATCH: `${prefix}:*`, COUNT: 100 });
      assert.equal(typeof scanned.cursor, 'string');
      assert.ok(Array.isArray(scanned.keys));
      assert.deepEqual(
        await run('multi', [
          { command: 'SET', args: [key('multi'), '1'] },
          { command: 'INCR', args: [key('multi')] },
        ]),
        ['OK', 2],
      );
      assert.equal(await run('raw', 'GET', [key('multi')]), '2');

      await run('subscribe', key('channel'));
      await run('subscribe', `${prefix}:*`, { pattern: true });
      await run('publish', key('channel'), 'message');
      for (let i = 0; events.length < 2 && i < 100; i++) await delay(10);
      assert.deepEqual(events.map((event) => event[3]).sort(), ['channel', 'pattern']);
      await run('unsubscribe', key('channel'));
      await run('unsubscribe', `${prefix}:*`, { pattern: true });

      const [bless] = await run('raw', 'COMMAND', ['INFO', 'BLESS']);
      await t.test('BLESS exports on a supporting server', { skip: !bless }, async () => {
        assert.equal(await run('blessSet', key('string'), 'NO-EVICT'), 1);
        assert.deepEqual(await run('blessGet', key('string')), ['NO-EVICT']);
        const scan = await run('blessScan', 0, 'NO-EVICT', { COUNT: 100 });
        assert.equal(typeof scan.cursor, 'string');
        assert.ok(Array.isArray(scan.keys));
        assert.equal(await run('blessClear', key('string'), 'NO-EVICT'), 1);
      });
      if (!bless) {
        // An exact command name also catches accidental raw dispatch of BLESS_GET/BLESS_SCAN.
        for (const [command, args] of [
          ['blessGet', [key('string')]],
          ['blessSet', [key('string'), 'NO-EVICT']],
          ['blessClear', [key('string'), 'NO-EVICT']],
          ['blessScan', [0, 'NO-EVICT', { COUNT: 100 }]],
        ]) {
          await assert.rejects(run(command, ...args), /unknown command ['"]BLESS['"]/i);
        }
      }
      await run('del', ['string', 'hash', 'scores', 'multi'].map(key));
    } finally {
      for (const handler of handlers.onResourceStop ?? []) handler('redisfx');
      runtime?.client?.destroy();
      for (const interval of intervals) clearInterval(interval);
      for (const [name, value] of Object.entries(originals)) {
        if (value === undefined) delete globalThis[name];
        else globalThis[name] = value;
      }
      await rm(directory, { recursive: true, force: true });
    }
  });
}
