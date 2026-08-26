import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { clearConvars, setConvar, resetNatives } from '../setup';

/** Applies convars for one case; the connection string is now read on demand. */
async function loadConfig(connectionString?: string, extra: Record<string, string | number> = {}) {
  clearConvars();
  if (connectionString !== undefined) setConvar('redis_connection_string', connectionString);
  for (const [key, value] of Object.entries(extra)) setConvar(key, value);

  return import('../../src/config.ts');
}

beforeEach(() => resetNatives());
afterEach(() => clearConvars());

describe('getConnectionOptions - URL form', () => {
  test('parses host, port and database', async () => {
    const { getConnectionOptions } = await loadConfig('redis://10.0.0.5:6380/3');
    const options = getConnectionOptions();

    expect(options.socket.host).toBe('10.0.0.5');
    expect(options.socket.port).toBe(6380);
    expect(options.database).toBe(3);
    expect(options.socket.tls).toBeUndefined();
  });

  test('defaults port and database when the URL omits them', async () => {
    const { getConnectionOptions } = await loadConfig('redis://localhost');
    const options = getConnectionOptions();

    expect(options.socket.port).toBe(6379);
    expect(options.database).toBe(0);
  });

  test('enables TLS for a rediss:// URL', async () => {
    const { getConnectionOptions } = await loadConfig('rediss://secure.example:6380/1');
    expect(getConnectionOptions().socket.tls).toBe(true);
  });

  test('percent-decodes credentials so passwords with reserved characters survive', async () => {
    const { getConnectionOptions } = await loadConfig('redis://us%40er:p%40ss%3Aword@localhost:6379');
    const options = getConnectionOptions();

    expect(options.username).toBe('us@er');
    expect(options.password).toBe('p@ss:word');
  });

  test('leaves credentials undefined when the URL has none', async () => {
    const { getConnectionOptions } = await loadConfig('redis://localhost:6379');
    const options = getConnectionOptions();

    expect(options.username).toBeUndefined();
    expect(options.password).toBeUndefined();
  });
});

describe('getConnectionOptions - key=value form', () => {
  test('parses aliases for host, password and database', async () => {
    const { getConnectionOptions } = await loadConfig('server=db.local;port=6390;pwd=secret;db=2;user=admin');
    const options = getConnectionOptions();

    expect(options.socket.host).toBe('db.local');
    expect(options.socket.port).toBe(6390);
    expect(options.password).toBe('secret');
    expect(options.database).toBe(2);
    expect(options.username).toBe('admin');
  });

  test('falls back to localhost:6379/0 when fields are missing', async () => {
    const { getConnectionOptions } = await loadConfig('password=secret');
    const options = getConnectionOptions();

    expect(options.socket.host).toBe('localhost');
    expect(options.socket.port).toBe(6379);
    expect(options.database).toBe(0);
  });

  test('honours an explicit tls flag', async () => {
    const { getConnectionOptions } = await loadConfig('host=db.local;tls=true');
    expect(getConnectionOptions().socket.tls).toBe(true);
  });
});

describe('getConnectionOptions - failure and tunables', () => {
  test('throws a directive error when the connection string is unset', async () => {
    const { getConnectionOptions } = await loadConfig('');
    expect(() => getConnectionOptions()).toThrow(/redis_connection_string is not set/);
  });

  test('defaults RESP to 3 and allows pinning RESP2', async () => {
    const withDefault = await loadConfig('redis://localhost');
    expect(withDefault.getConnectionOptions().RESP).toBe(3);

    const pinned = await loadConfig('redis://localhost', { redis_resp: 2 });
    expect(pinned.getConnectionOptions().RESP).toBe(2);
  });

  test('command timeout is configurable and disabled by zero', async () => {
    const withDefault = await loadConfig('redis://localhost');
    expect(withDefault.getConnectionOptions().commandOptions?.timeout).toBe(5000);

    const custom = await loadConfig('redis://localhost', { redis_command_timeout: 250 });
    expect(custom.getConnectionOptions().commandOptions?.timeout).toBe(250);

    const disabled = await loadConfig('redis://localhost', { redis_command_timeout: 0 });
    expect(disabled.getConnectionOptions().commandOptions?.timeout).toBeUndefined();
  });

  test('the reconnect strategy backs off but stays capped', async () => {
    const { getConnectionOptions } = await loadConfig('redis://localhost');
    const strategy = getConnectionOptions().socket.reconnectStrategy!;

    expect(strategy(0)).toBe(200);
    expect(strategy(1)).toBe(400);
    expect(strategy(50)).toBe(12800);
    expect(strategy(1000)).toBeLessThanOrEqual(30000);
  });
});

describe('setDebug', () => {
  test('reads convars and derives the log size', async () => {
    const config = await loadConfig('redis://localhost', { redis_ui: 'true', redis_slow_query_warning: 500 });
    config.setDebug();

    expect(config.redis_ui).toBe(true);
    expect(config.redis_slow_query_warning).toBe(500);
    expect(config.redis_debug).toBe(false);
    expect(config.redis_log_size).toBe(100);
  });

  test('parses a JSON array of resources into a debug allow-list', async () => {
    const config = await loadConfig('redis://localhost', { redis_debug: '["alpha","beta"]' });
    config.setDebug();

    expect(config.redis_debug).toEqual(['alpha', 'beta']);
    expect(config.redis_log_size).toBe(10000);
  });

  test('treats an unparseable debug value as "debug everything"', async () => {
    const config = await loadConfig('redis://localhost', { redis_debug: 'not-json' });
    config.setDebug();

    expect(config.redis_debug).toBe(true);
  });
});

describe('redisfx_debug command', () => {
  test('adds and removes resources from the debug list', async () => {
    const config = await loadConfig('redis://localhost');
    const { getCommand } = await import('../setup');
    const handler = getCommand('redisfx_debug');

    handler(0, ['add', 'alpha']);
    expect(config.redis_debug).toEqual(['alpha']);

    handler(0, ['add', 'beta']);
    expect(config.redis_debug).toEqual(['alpha', 'beta']);

    handler(0, ['remove', 'alpha']);
    expect(config.redis_debug).toEqual(['beta']);

    handler(0, ['remove', 'beta']);
    expect(config.redis_debug).toBe(false);
  });

  test('refuses to run from a client source', async () => {
    await loadConfig('redis://localhost');
    const { getCommand } = await import('../setup');
    expect(getCommand('redisfx_debug')(1, ['add', 'alpha'])).toBeUndefined();
  });
});
