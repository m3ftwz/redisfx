/**
 * Minimal stand-in for a node-redis client. It records every dispatched call so tests can assert
 * on the exact command and argument shape that reaches the driver, and lets individual commands be
 * scripted to return a value or throw.
 */
export interface FakeMulti {
  calls: { method: string; args: any[] }[];
  queued: string[][];
  exec: () => Promise<any[]>;
  addCommand: (args: string[]) => FakeMulti;
  [command: string]: any;
}

export interface FakeClient {
  calls: { method: string; args: any[] }[];
  results: Record<string, any>;
  failures: Record<string, unknown>;
  sendCommandCalls: any[][];
  multiCalls: FakeMulti[];
  destroyed: number;
  sendCommand: (args: any[]) => Promise<any>;
  multi: () => FakeMulti;
  duplicate: () => FakeClient;
  connect: () => Promise<FakeClient>;
  destroy: () => void;
  on: (event: string, handler: Function) => FakeClient;
  emitEvent: (event: string, ...args: any[]) => void;
  ping: () => Promise<string>;
  info: (section?: string) => Promise<string>;
  ops: () => string[];
  reset: () => void;
  duplicates: FakeClient[];
  listeners: Function[];
  [command: string]: any;
}

/** Commands the fake exposes as real methods; anything else falls through to sendCommand. */
const DEFAULT_METHODS = [
  'GET',
  'SET',
  'DEL',
  'EXISTS',
  'HSET',
  'HGETALL',
  'HDEL',
  'ZADD',
  'ZRANGE',
  'ZRANGE_WITHSCORES',
  'SRANDMEMBER',
  'SRANDMEMBER_COUNT',
  'SCAN',
  'PING',
  'LPUSH',
  'SADD',
  'HEXPIRE',
  'HGETDEL',
  'GETDEL',
  'PUBLISH',
  'INCR',
  'EXPIRE',
  'TTL',
  'KEYS',
];

export function createFakeClient(methods: string[] = DEFAULT_METHODS): FakeClient {
  const calls: { method: string; args: any[] }[] = [];
  const handlers: Record<string, Function[]> = {};

  const client = {
    calls,
    results: {} as Record<string, any>,
    failures: {} as Record<string, unknown>,
    sendCommandCalls: [] as any[][],
    multiCalls: [] as FakeMulti[],
    destroyed: 0,
    ops: () => calls.map((c) => c.method),

    async sendCommand(args: any[]) {
      calls.push({ method: 'sendCommand', args });
      client.sendCommandCalls.push(args);
      const name = String(args[0]);
      if (name in client.failures) throw client.failures[name];
      return name in client.results ? client.results[name] : 'OK';
    },

    multi() {
      const queued: string[][] = [];
      const multiCalls: { method: string; args: any[] }[] = [];

      const multi = new Proxy(
        {
          calls: multiCalls,
          queued,
          addCommand(args: string[]) {
            queued.push(args);
            multiCalls.push({ method: 'addCommand', args });
            return multi;
          },
          async exec() {
            if ('EXEC' in client.failures) throw client.failures.EXEC;
            return client.results.EXEC ?? multiCalls.map(() => 'OK');
          },
        } as any,
        {
          get(target, prop: string) {
            if (prop in target) return target[prop];
            if (!methods.includes(prop)) return undefined;
            return (...args: any[]) => {
              multiCalls.push({ method: prop, args });
              return multi;
            };
          },
          has(target, prop: string) {
            return prop in target || methods.includes(prop);
          },
        },
      ) as FakeMulti;

      client.multiCalls.push(multi);
      return multi;
    },

    duplicate() {
      const copy = createFakeClient(methods);
      client.duplicates.push(copy);
      return copy;
    },
    duplicates: [] as FakeClient[],

    async connect() {
      calls.push({ method: 'connect', args: [] });
      if ('connect' in client.failures) throw client.failures.connect;
      return client;
    },

    destroy() {
      client.destroyed += 1;
      if ('destroy' in client.failures) throw client.failures.destroy;
    },

    on(event: string, handler: Function) {
      (handlers[event] ??= []).push(handler);
      return client;
    },

    emitEvent(event: string, ...args: any[]) {
      for (const handler of handlers[event] ?? []) handler(...args);
    },

    async ping() {
      calls.push({ method: 'ping', args: [] });
      if ('ping' in client.failures) throw client.failures.ping;
      return client.results.ping ?? 'PONG';
    },

    async info(section?: string) {
      calls.push({ method: 'info', args: [section] });
      return client.results.info ?? 'redis_version:8.0.0\r\n';
    },

    // Pub/sub
    async subscribe(channels: string[], listener: Function) {
      calls.push({ method: 'subscribe', args: [channels] });
      if ('subscribe' in client.failures) throw client.failures.subscribe;
      client.listeners.push(listener);
    },
    async pSubscribe(channels: string[], listener: Function) {
      calls.push({ method: 'pSubscribe', args: [channels] });
      client.listeners.push(listener);
    },
    async sSubscribe(channels: string[], listener: Function) {
      calls.push({ method: 'sSubscribe', args: [channels] });
      client.listeners.push(listener);
    },
    async unsubscribe(channels: string[]) {
      calls.push({ method: 'unsubscribe', args: [channels] });
    },
    async pUnsubscribe(channels: string[]) {
      calls.push({ method: 'pUnsubscribe', args: [channels] });
    },
    async sUnsubscribe(channels: string[]) {
      calls.push({ method: 'sUnsubscribe', args: [channels] });
    },
    listeners: [] as Function[],

    /** Clears recorded calls and scripted behaviour without replacing the object identity, so a
     * module that captured this client as a live binding keeps working across tests. */
    reset() {
      calls.length = 0;
      client.sendCommandCalls.length = 0;
      client.multiCalls.length = 0;
      client.duplicates.length = 0;
      client.listeners.length = 0;
      client.destroyed = 0;
      for (const key of Object.keys(client.results)) delete client.results[key];
      for (const key of Object.keys(client.failures)) delete client.failures[key];
      for (const key of Object.keys(handlers)) delete handlers[key];
    },
  } as unknown as FakeClient;

  for (const method of methods) {
    client[method] = async (...args: any[]) => {
      calls.push({ method, args });
      if (method in client.failures) throw client.failures[method];
      return method in client.results ? client.results[method] : 'OK';
    };
  }

  return client;
}
