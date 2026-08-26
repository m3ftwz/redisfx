import { describe, test, expect, beforeEach } from 'bun:test';
import { poolClient as client, resetMocks } from '../../helpers/mocks';
import { resetNatives, getTriggeredEvents } from '../../setup';

// execute.ts captures `client` from the (globally mocked) pool at import time, so the fake keeps a
// stable identity and is reset between tests rather than replaced.
const { executeCommand, executeMulti } = await import('../../../src/database/execute.ts');

beforeEach(() => {
  resetNatives();
  resetMocks();
});

describe('executeCommand - dispatch', () => {
  test('calls the typed node-redis method when one exists', async () => {
    client.results.GET = 'value';

    await expect(executeCommand('res', 'GET', ['key'])).resolves.toBe('value');
    expect(client.calls).toEqual([{ method: 'GET', args: ['key'] }]);
  });

  test('maps modifier commands through COMMAND_MAP before dispatching', async () => {
    await executeCommand('res', 'ZRANGEWITHSCORES', ['z', 0, -1]);
    expect(client.ops()).toEqual(['ZRANGE_WITHSCORES']);
  });

  test('falls back to sendCommand for a command node-redis does not model', async () => {
    await executeCommand('res', 'ZREVRANGE', ['z', 0, -1]);

    expect(client.sendCommandCalls).toEqual([['ZREVRANGE', 'z', '0', '-1']]);
  });

  test('the raw path always uses sendCommand and stringifies every argument', async () => {
    await executeCommand('res', 'GET', ['key'], undefined, undefined, true);

    expect(client.sendCommandCalls).toEqual([['GET', 'key']]);
    // the typed GET must not have been used
    expect(client.ops()).not.toContain('GET');
  });

  test('the raw path flattens array arguments into variadic form', async () => {
    await executeCommand('res', 'DEL', [['a', 'b']], undefined, undefined, true);
    expect(client.sendCommandCalls).toEqual([['DEL', 'a', 'b']]);
  });
});

describe('executeCommand - callbacks and errors', () => {
  test('invokes the callback with the result and still resolves', async () => {
    client.results.GET = 'value';
    const seen: unknown[] = [];

    await expect(executeCommand('res', 'GET', ['key'], (r) => seen.push(r))).resolves.toBe('value');
    expect(seen).toEqual(['value']);
  });

  test('rethrows when there is no promise-mode callback to reject through', async () => {
    client.failures.GET = new Error('boom');
    await expect(executeCommand('res', 'GET', ['key'])).rejects.toThrow('boom');
  });

  test('routes the error into the callback and resolves undefined in promise mode', async () => {
    client.failures.GET = new Error('boom');
    const seen: unknown[][] = [];

    await expect(executeCommand('res', 'GET', ['key'], (r, e) => seen.push([r, e]), true)).resolves.toBeUndefined();

    expect(seen).toHaveLength(1);
    expect(seen[0][0]).toBeNull();
    expect(String(seen[0][1])).toContain('boom');
  });

  test('emits redisfx:error with the failing command', async () => {
    client.failures.GET = new Error('boom');

    await executeCommand('res', 'GET', ['key'], () => {}, true);

    const events = getTriggeredEvents().filter(([name]) => name === 'redisfx:error');
    expect(events).toHaveLength(1);
    expect(events[0][1]).toMatchObject({ command: 'GET', resource: 'res' });
  });

  test('a null argument on the raw path fails loudly instead of sending an empty string', async () => {
    await expect(executeCommand('res', 'SET', ['k', null], undefined, undefined, true)).rejects.toThrow(TypeError);
  });
});

describe('executeMulti', () => {
  test('queues each command on the transaction and returns the exec results', async () => {
    client.results.EXEC = ['OK', 2];

    const results = await executeMulti('res', [
      { command: 'SET', args: ['k', 'v'] },
      { command: 'INCR', args: ['n'] },
    ]);

    expect(results).toEqual(['OK', 2] as any);
    expect(client.multiCalls[0].calls).toEqual([
      { method: 'SET', args: ['k', 'v'] },
      { method: 'INCR', args: ['n'] },
    ]);
  });

  test('uses addCommand for commands the driver does not model', async () => {
    await executeMulti('res', [{ command: 'ZREVRANGE', args: ['z', 0, -1] }]);
    expect(client.multiCalls[0].queued).toEqual([['ZREVRANGE', 'z', '0', '-1']]);
  });

  test('treats a missing args field as no arguments', async () => {
    await executeMulti('res', [{ command: 'PING' }]);
    expect(client.multiCalls[0].calls).toEqual([{ method: 'PING', args: [] }]);
  });

  test('wraps a non-array args field rather than throwing on spread', async () => {
    await executeMulti('res', [{ command: 'GET', args: 'key' as any }]);
    expect(client.multiCalls[0].calls).toEqual([{ method: 'GET', args: ['key'] }]);
  });

  test('rejects a non-array command list', async () => {
    await expect(executeMulti('res', 'nope' as any)).rejects.toThrow(/Expected an array of commands/);
  });

  test('rejects an entry without a command string', async () => {
    await expect(executeMulti('res', [{ args: ['k'] } as any])).rejects.toThrow(/Invalid command format/);
  });

  test('routes an exec failure through the callback in promise mode', async () => {
    client.failures.EXEC = new Error('multi boom');
    const seen: unknown[][] = [];

    await expect(
      executeMulti('res', [{ command: 'SET', args: ['k', 'v'] }], (r, e) => seen.push([r, e]), true),
    ).resolves.toBeUndefined();

    expect(String(seen[0][1])).toContain('multi boom');
  });
});
