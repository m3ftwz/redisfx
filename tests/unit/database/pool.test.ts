import { describe, test, expect, beforeEach } from 'bun:test';
import { redisFactory, resetMocks } from '../../helpers/mocks';
import { resetNatives, setConvar, clearConvars } from '../../setup';

// pool.ts is the module under test, so it is loaded directly instead of through the shared stub
// the rest of the suite uses. `redis` stays mocked, and config is driven through real convars.
const { createRedisClient } = await import('../../../src/database/pool.ts?real');

const logs: string[] = [];
const originalLog = console.log;

beforeEach(() => {
  resetNatives();
  clearConvars();
  resetMocks();
  logs.length = 0;
  console.log = (...args: any[]) =>
    logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
});

function restoreLog() {
  console.log = originalLog;
}

const client = () => redisFactory.nextClient;

describe('createRedisClient - configuration failures', () => {
  test('an unset connection string is reported without rejecting', async () => {
    // Regression: the config read used to sit outside the try block, so this rejection escaped
    // into the caller's retry loop and killed it permanently.
    await expect(createRedisClient()).resolves.toBeUndefined();
    restoreLog();

    expect(logs.join('\n')).toContain('redis_connection_string is not set');
    expect(redisFactory.calls).toHaveLength(0);
  });

  test('a malformed URL is reported without rejecting', async () => {
    setConvar('redis_connection_string', 'redis://[not-a-url');

    await expect(createRedisClient()).resolves.toBeUndefined();
    restoreLog();

    expect(redisFactory.calls).toHaveLength(0);
  });
});

describe('createRedisClient - connection', () => {
  test('passes the parsed options straight to node-redis', async () => {
    setConvar('redis_connection_string', 'redis://user:pass@db.local:6390/2');

    await createRedisClient();
    restoreLog();

    expect(redisFactory.calls[0]).toMatchObject({ username: 'user', password: 'pass', database: 2, RESP: 3 });
    expect(redisFactory.calls[0].socket).toMatchObject({ host: 'db.local', port: 6390 });
  });

  test('verifies the connection with PING and reports the server version', async () => {
    setConvar('redis_connection_string', 'redis://localhost');
    client().results.info = 'redis_version:8.2.1\r\n';

    await createRedisClient();
    restoreLog();

    expect(client().ops()).toContain('connect');
    expect(client().ops()).toContain('ping');
    expect(logs.join('\n')).toContain('Redis 8.2.1');
    expect(logs.join('\n')).toContain('connection established');
  });

  test('treats a non-PONG reply as a failed connection and destroys the client', async () => {
    setConvar('redis_connection_string', 'redis://localhost');
    client().results.ping = 'NOPE';

    await createRedisClient();
    restoreLog();

    expect(logs.join('\n')).toContain('Unable to establish a connection');
    expect(client().destroyed).toBe(1);
  });

  test('destroys the half-open client when connect fails, so it stops its own retry loop', async () => {
    setConvar('redis_connection_string', 'redis://localhost');
    client().failures.connect = new Error('ECONNREFUSED');

    await createRedisClient();
    restoreLog();

    expect(client().destroyed).toBe(1);
    expect(logs.join('\n')).toContain('ECONNREFUSED');
  });

  test('masks the password when dumping the config after a failure', async () => {
    setConvar('redis_connection_string', 'redis://user:hunter2@localhost');
    client().failures.connect = new Error('nope');

    await createRedisClient();
    restoreLog();

    expect(logs.join('\n')).not.toContain('hunter2');
  });

  test('a synchronous destroy() throw does not escape the error path', async () => {
    setConvar('redis_connection_string', 'redis://localhost');
    client().failures.connect = new Error('nope');
    client().failures.destroy = new Error('already gone');

    await expect(createRedisClient()).resolves.toBeUndefined();
    restoreLog();
  });
});

describe('createRedisClient - error log throttling', () => {
  test('repeats of the same error are collapsed instead of flooding the console', async () => {
    setConvar('redis_connection_string', 'redis://localhost');

    await createRedisClient();
    const before = logs.length;

    for (let i = 0; i < 40; i++) client().emitEvent('error', new Error('ECONNREFUSED'));
    restoreLog();

    // the first occurrence logs, the following 39 are suppressed
    expect(logs.length - before).toBe(1);
  });

  test('a different error message logs again', async () => {
    setConvar('redis_connection_string', 'redis://localhost');

    await createRedisClient();
    const before = logs.length;

    client().emitEvent('error', new Error('first'));
    client().emitEvent('error', new Error('second'));
    restoreLog();

    expect(logs.length - before).toBe(2);
  });
});

describe('createRedisClient - reconnect reporting', () => {
  test('reports a reconnect once a connection has been established', async () => {
    // pool.ts keeps `client` as module state, so once any test in this file has connected the
    // reconnect notice is expected to fire.
    setConvar('redis_connection_string', 'redis://localhost');

    await createRedisClient();
    const before = logs.length;

    client().emitEvent('reconnecting');
    restoreLog();

    expect(logs.slice(before).join('\n')).toContain('reconnecting');
  });

  test('the suppression counter reports periodically instead of going silent forever', async () => {
    setConvar('redis_connection_string', 'redis://localhost');

    await createRedisClient();
    const before = logs.length;

    for (let i = 0; i < 51; i++) client().emitEvent('error', new Error('ECONNREFUSED'));
    restoreLog();

    const emitted = logs.slice(before);
    expect(emitted).toHaveLength(2);
    expect(emitted[1]).toContain('repeated 50 times');
  });
});
