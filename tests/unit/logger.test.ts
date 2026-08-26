import { describe, test, expect, beforeEach } from 'bun:test';
import {
  resetNatives,
  setConvar,
  clearConvars,
  getCommand,
  getNetHandler,
  getEmitNetCalls,
  getTriggeredEvents,
} from '../setup';

// The logger reads its settings as live bindings from config, so drive the real module through
// convars + setDebug() rather than mocking it - a mocked namespace would not be live.
const { setDebug } = await import('../../src/config.ts');
const { logCommand, logError } = await import('../../src/logger/index.ts');

/** Applies convars and refreshes the config bindings the logger reads. */
function configure(convars: Record<string, string | number | boolean> = {}) {
  clearConvars();
  for (const [key, value] of Object.entries(convars)) setConvar(key, value);
  setDebug();
}

const logs: string[] = [];
const errors: string[] = [];
const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  resetNatives();
  logs.length = 0;
  errors.length = 0;
  configure();
  console.log = (...args: any[]) => logs.push(args.map(String).join(' '));
  console.error = (...args: any[]) => errors.push(args.map(String).join(' '));
});

function restoreConsole() {
  console.log = originalLog;
  console.error = originalError;
}

describe('logCommand', () => {
  test('stays quiet for a fast command with debug off', () => {
    logCommand('res', 'GET', ['key'], 5);
    restoreConsole();

    expect(logs).toHaveLength(0);
  });

  test('warns when a command exceeds the slow threshold', () => {
    logCommand('res', 'KEYS', ['*'], 500);
    restoreConsole();

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('res took 500.0000ms');
    expect(logs[0]).toContain('KEYS');
  });

  test('logs every command when debug is globally enabled', () => {
    configure({ redis_debug: 'true' });
    logCommand('res', 'GET', ['key'], 1);
    restoreConsole();

    expect(logs).toHaveLength(1);
  });

  test('an allow-list only logs the listed resources', () => {
    configure({ redis_debug: JSON.stringify(['alpha']) });

    logCommand('alpha', 'GET', ['key'], 1);
    logCommand('beta', 'GET', ['key'], 1);
    restoreConsole();

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('alpha');
  });

  test('omits the argument list when there are no arguments', () => {
    configure({ redis_debug: 'true' });
    logCommand('res', 'PING', [], 1);
    restoreConsole();

    expect(logs[0]).toContain('PING');
    expect(logs[0]).not.toContain('[]');
  });
});

describe('logError', () => {
  test('prints to stderr when there is no promise-mode callback', () => {
    logError('res', undefined, undefined, new Error('boom'), 'GET', ['key']);
    restoreConsole();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('res was unable to execute a Redis command!');
    expect(errors[0]).toContain('GET ["key"]');
    expect(errors[0]).toContain('boom');
  });

  test('hands the formatted message to the callback in promise mode', () => {
    const seen: unknown[][] = [];
    logError('res', (r, e) => seen.push([r, e]), true, new Error('boom'), 'GET', ['key']);
    restoreConsole();

    expect(errors).toHaveLength(0);
    expect(seen[0][0]).toBeNull();
    expect(String(seen[0][1])).toContain('boom');
  });

  test('a throwing callback does not propagate', () => {
    expect(() =>
      logError(
        'res',
        () => {
          throw new Error('callback exploded');
        },
        true,
        new Error('boom'),
      ),
    ).not.toThrow();
    restoreConsole();
  });

  test('strips the citizen script-error prefix from string errors', () => {
    logError('res', undefined, undefined, 'SCRIPT ERROR: citizen:/scripting/v8/main.js:12: real message');
    restoreConsole();

    expect(errors[0]).toContain('real message');
    expect(errors[0]).not.toContain('citizen:');
  });

  test('emits redisfx:error with the command context', () => {
    logError('res', undefined, undefined, new Error('boom'), 'GET', ['key']);
    restoreConsole();

    const [name, payload] = getTriggeredEvents()[0];
    expect(name).toBe('redisfx:error');
    expect(payload).toMatchObject({ command: 'GET', resource: 'res', message: 'boom' });
  });
});

describe('redis command and UI events', () => {
  test('the redis command is inert while the UI is disabled', () => {
    configure({ redis_ui: 'false' });
    getCommand('redis')(1);
    restoreConsole();

    expect(getEmitNetCalls()).toHaveLength(0);
  });

  test('the redis command refuses to run server side', () => {
    configure({ redis_ui: 'true' });
    getCommand('redis')(0);
    restoreConsole();

    expect(getEmitNetCalls()).toHaveLength(0);
    expect(logs.join('\n')).toContain('cannot run server side');
  });

  // logStorage is module state shared by the whole file, so each case uses its own resource name
  // and asserts on that resource rather than on global totals.
  test('the redis command reports aggregate stats to the player', () => {
    configure({ redis_ui: 'true' });
    logCommand('agg-res', 'GET', ['k'], 10);
    logCommand('agg-res', 'KEYS', ['*'], 500);

    getCommand('redis')(1);
    restoreConsole();

    const [event, source, payload] = getEmitNetCalls()[0];
    expect(event).toBe('redisfx:openUi');
    expect(source).toBe(1);
    expect(payload.resources).toContain('agg-res');

    const index = payload.chartData.labels.indexOf('agg-res');
    expect(payload.chartData.data[index]).toEqual({ commands: 2, time: 510 });
    expect(payload.slowCommands).toBeGreaterThanOrEqual(1);
  });

  test('fetchResource ignores a request for an unknown resource instead of throwing', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    expect(() =>
      getNetHandler('redisfx:fetchResource')({ resource: 'does-not-exist', pageIndex: 0, search: '' }),
    ).not.toThrow();
    restoreConsole();

    expect(getEmitNetCalls()).toHaveLength(0);
  });

  test('fetchResource returns a page of commands for a known resource', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    for (let i = 0; i < 12; i++) logCommand('page-res', `GET${i}`, ['k'], 1);

    getNetHandler('redisfx:fetchResource')({ resource: 'page-res', pageIndex: 0, search: '' });
    restoreConsole();

    const [, , payload] = getEmitNetCalls()[0];
    expect(payload.commands).toHaveLength(10);
    expect(payload.pageCount).toBe(2);
    expect(payload.resourceCommandsCount).toBe(12);
  });

  test('fetchResource is denied without the ace permission', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => false;
    logCommand('alpha', 'GET', ['k'], 1);

    getNetHandler('redisfx:fetchResource')({ resource: 'alpha', pageIndex: 0, search: '' });
    restoreConsole();

    expect(getEmitNetCalls()).toHaveLength(0);
  });
});

describe('fetchResource sorting and filtering', () => {
  test('sorts by command name, ascending and descending', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    logCommand('sort-res', 'GET', ['k'], 1);
    logCommand('sort-res', 'ZADD', ['k'], 1);
    logCommand('sort-res', 'HSET', ['k'], 1);

    getNetHandler('redisfx:fetchResource')({
      resource: 'sort-res',
      pageIndex: 0,
      search: '',
      sortBy: [{ id: 'command', desc: false }],
    });

    getNetHandler('redisfx:fetchResource')({
      resource: 'sort-res',
      pageIndex: 0,
      search: '',
      sortBy: [{ id: 'command', desc: true }],
    });
    restoreConsole();

    const asc = getEmitNetCalls()[0][2].commands.map((c: any) => c.command);
    const desc = getEmitNetCalls()[1][2].commands.map((c: any) => c.command);

    expect(asc).toEqual(['GET', 'HSET', 'ZADD']);
    expect(desc).toEqual(['ZADD', 'HSET', 'GET']);
  });

  test('sorts by execution time', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    logCommand('time-res', 'SLOW', ['k'], 30);
    logCommand('time-res', 'FAST', ['k'], 1);

    getNetHandler('redisfx:fetchResource')({
      resource: 'time-res',
      pageIndex: 0,
      search: '',
      sortBy: [{ id: 'executionTime', desc: false }],
    });
    restoreConsole();

    expect(getEmitNetCalls()[0][2].commands.map((c: any) => c.command)).toEqual(['FAST', 'SLOW']);
  });

  test('an unknown sort id leaves the order untouched', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    logCommand('noop-res', 'A', ['k'], 1);
    logCommand('noop-res', 'B', ['k'], 1);

    getNetHandler('redisfx:fetchResource')({
      resource: 'noop-res',
      pageIndex: 0,
      search: '',
      sortBy: [{ id: 'nonsense', desc: false } as any],
    });
    restoreConsole();

    expect(getEmitNetCalls()[0][2].commands.map((c: any) => c.command)).toEqual(['A', 'B']);
  });

  test('filters by a case-insensitive search term', () => {
    configure({ redis_ui: 'true' });
    (globalThis as any).IsPlayerAceAllowed = () => true;

    logCommand('search-res', 'HGETALL', ['k'], 1);
    logCommand('search-res', 'SET', ['k'], 1);

    getNetHandler('redisfx:fetchResource')({ resource: 'search-res', pageIndex: 0, search: 'hget' });
    restoreConsole();

    const payload = getEmitNetCalls()[0][2];
    expect(payload.commands.map((c: any) => c.command)).toEqual(['HGETALL']);
    expect(payload.resourceCommandsCount).toBe(1);
  });

  test('trims the log once it exceeds redis_log_size', () => {
    configure({ redis_ui: 'true', redis_log_size: 3 });

    for (let i = 0; i < 10; i++) logCommand('trim-res', `C${i}`, ['k'], 1);

    (globalThis as any).IsPlayerAceAllowed = () => true;
    getNetHandler('redisfx:fetchResource')({ resource: 'trim-res', pageIndex: 0, search: '' });
    restoreConsole();

    // the buffer drops one entry per push once it is over the cap
    expect(getEmitNetCalls()[0][2].resourceCommandsCount).toBeLessThanOrEqual(5);
  });
});
