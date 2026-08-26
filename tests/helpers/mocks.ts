import { mock } from 'bun:test';
import { createFakeClient, type FakeClient } from './redis';

/**
 * `mock.module` is process-global in bun, so every module stub lives here and is registered once
 * from the preloaded setup. Two test files registering different shapes for the same specifier
 * would otherwise clobber each other depending on execution order.
 *
 * Everything is driven through stable object identities and plain functions rather than getters,
 * because a mocked namespace does not reproduce ESM live bindings.
 */

/** The client that `database/pool.ts` hands to consumers. */
export const poolClient: FakeClient = createFakeClient();

/** The client that a mocked `redis.createClient()` returns, and the options it was called with. */
export const redisFactory = {
  nextClient: createFakeClient(),
  calls: [] as any[],
  reset() {
    redisFactory.nextClient = createFakeClient();
    redisFactory.calls.length = 0;
  },
};

/** Records everything that reaches `database/index.ts` from the exports layer. */
export const databaseCalls = {
  commands: [] as {
    invokingResource: unknown;
    command: string;
    args: unknown[];
    cb: unknown;
    isPromise: unknown;
    raw?: unknown;
  }[],
  multi: [] as { invokingResource: unknown; commands: unknown; cb: unknown; isPromise: unknown }[],
  result: 'RESULT' as unknown,
  failure: undefined as string | undefined,
  reset() {
    databaseCalls.commands.length = 0;
    databaseCalls.multi.length = 0;
    databaseCalls.result = 'RESULT';
    databaseCalls.failure = undefined;
  },
};

/** Records calls made by the exports layer into the pub/sub module. */
export const pubsubCalls = {
  entries: [] as any[],
  reset() {
    pubsubCalls.entries.length = 0;
  },
};

export function resetMocks() {
  poolClient.reset();
  redisFactory.reset();
  databaseCalls.reset();
  pubsubCalls.reset();
}

mock.module('redis', () => ({
  createClient: (options: any) => {
    redisFactory.calls.push(options);
    return redisFactory.nextClient;
  },
}));

mock.module(require.resolve('../../src/database/pool.ts'), () => ({
  client: poolClient,
  redisVersion: '^5[Redis 8.0.0]',
  createRedisClient: async () => {},
}));

mock.module(require.resolve('../../src/database/index.ts'), () => ({
  client: poolClient,
  redisVersion: '^5[Redis 8.0.0]',
  executeCommand: (
    invokingResource: unknown,
    command: string,
    args: unknown[],
    cb: any,
    isPromise: unknown,
    raw?: unknown,
  ) => {
    databaseCalls.commands.push({ invokingResource, command, args, cb, isPromise, raw });

    if (databaseCalls.failure) {
      cb?.(null, databaseCalls.failure);
      return Promise.resolve(undefined);
    }

    cb?.(databaseCalls.result);
    return Promise.resolve(databaseCalls.result);
  },
  executeMulti: (invokingResource: unknown, commands: unknown, cb: any, isPromise: unknown) => {
    databaseCalls.multi.push({ invokingResource, commands, cb, isPromise });
    cb?.(databaseCalls.result);
    return Promise.resolve(databaseCalls.result);
  },
}));

mock.module(require.resolve('../../src/database/pubsub.ts'), () => ({
  subscribe: (...args: any[]) => {
    pubsubCalls.entries.push(['subscribe', ...args]);
    args[3]?.(true);
    return Promise.resolve(true);
  },
  unsubscribe: (...args: any[]) => {
    pubsubCalls.entries.push(['unsubscribe', ...args]);
    args[3]?.(true);
    return Promise.resolve(true);
  },
  releaseResource: async () => {},
  closeSubscriber: () => pubsubCalls.entries.push(['close']),
}));

// The update checker performs a network request on import.
mock.module(require.resolve('../../src/update/index.ts'), () => ({}));
