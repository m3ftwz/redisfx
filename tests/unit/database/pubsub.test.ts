import { describe, test, expect, beforeEach } from 'bun:test';
import { poolClient as client, resetMocks } from '../../helpers/mocks';
import { resetNatives, getEmitCalls, getEventHandlers } from '../../setup';

// pubsub.ts is the module under test, so it is imported directly rather than through the shared
// stub that the exports layer uses.
const { subscribe, unsubscribe, releaseResource, closeSubscriber } =
  await import('../../../src/database/pubsub.ts?real');

/** The subscriber is a duplicate of the main client, created on first subscribe. */
const sub = () => client.duplicates[0];

beforeEach(() => {
  resetNatives();
  closeSubscriber();
  resetMocks();
});

describe('subscribe', () => {
  test('creates and connects a dedicated subscriber connection', async () => {
    await subscribe('res', ['chan'], {});

    expect(client.duplicates).toHaveLength(1);
    expect(sub().ops()).toContain('connect');
    expect(sub().calls.find((c) => c.method === 'subscribe')?.args).toEqual([['chan']]);
  });

  test('reuses the same subscriber for later subscriptions', async () => {
    await subscribe('res', ['a'], {});
    await subscribe('res', ['b'], {});

    expect(client.duplicates).toHaveLength(1);
  });

  test('only issues SUBSCRIBE for channels not already joined', async () => {
    await subscribe('alpha', ['shared'], {});
    await subscribe('beta', ['shared', 'other'], {});

    const subscribeCalls = sub().calls.filter((c) => c.method === 'subscribe');
    expect(subscribeCalls[0].args).toEqual([['shared']]);
    expect(subscribeCalls[1].args).toEqual([['other']]);
  });

  test('routes pattern and sharded modes to the matching driver call', async () => {
    await subscribe('res', ['a*'], { pattern: true });
    await subscribe('res', ['s'], { sharded: true });

    expect(sub().ops()).toContain('pSubscribe');
    expect(sub().ops()).toContain('sSubscribe');
  });

  test('delivers messages as the redisfx:message event', async () => {
    await subscribe('res', ['chan'], {});

    sub().listeners[0]('payload', 'chan');

    expect(getEmitCalls()).toEqual([['redisfx:message', 'chan', 'payload', 'channel']]);
  });

  test('tags pattern deliveries with their mode', async () => {
    await subscribe('res', ['a*'], { pattern: true });

    sub().listeners[0]('payload', 'abc');

    expect(getEmitCalls()).toEqual([['redisfx:message', 'abc', 'payload', 'pattern']]);
  });

  test('a failed subscribe does not leave the channel registered', async () => {
    // Force the driver call to fail, then confirm a retry re-issues SUBSCRIBE rather than
    // assuming the channel is already live.
    await subscribe('res', ['warm'], {});
    sub().failures.subscribe = new Error('nope');

    await expect(subscribe('res', ['chan'], {})).rejects.toThrow('nope');

    delete sub().failures.subscribe;
    await subscribe('res', ['chan'], {});

    const subscribeCalls = sub().calls.filter((c) => c.method === 'subscribe');
    expect(subscribeCalls.at(-1)?.args).toEqual([['chan']]);
  });

  test('reports the failure through the callback in promise mode', async () => {
    await subscribe('res', ['warm'], {});
    sub().failures.subscribe = new Error('nope');

    const seen: unknown[][] = [];
    await expect(
      subscribe('res', ['chan'], {}, (r: unknown, e?: string) => seen.push([r, e]), true),
    ).resolves.toBeUndefined();

    expect(String(seen[0][1])).toContain('nope');
  });
});

describe('unsubscribe', () => {
  test('leaves the channel only once the last owner drops it', async () => {
    await subscribe('alpha', ['shared'], {});
    await subscribe('beta', ['shared'], {});

    await unsubscribe('alpha', ['shared'], {});
    expect(sub().ops()).not.toContain('unsubscribe');

    await unsubscribe('beta', ['shared'], {});
    expect(sub().calls.find((c) => c.method === 'unsubscribe')?.args).toEqual([['shared']]);
  });

  test('ignores channels the resource never subscribed to', async () => {
    await subscribe('alpha', ['a'], {});
    await unsubscribe('alpha', ['never'], {});

    expect(sub().ops()).not.toContain('unsubscribe');
  });

  test('is a no-op before any subscriber exists', async () => {
    await expect(unsubscribe('alpha', ['a'], {})).resolves.toBe(true);
    expect(client.duplicates).toHaveLength(0);
  });
});

describe('resource lifecycle', () => {
  test('a stopped resource releases only its own channels', async () => {
    await subscribe('alpha', ['only-alpha', 'shared'], {});
    await subscribe('beta', ['shared'], {});

    await releaseResource('alpha');

    const dropped = sub()
      .calls.filter((c) => c.method === 'unsubscribe')
      .flatMap((c) => c.args[0]);

    expect(dropped).toEqual(['only-alpha']);
  });

  test('the onResourceStop handler ignores the redisfx resource itself', async () => {
    await subscribe('alpha', ['chan'], {});

    for (const handler of getEventHandlers('onResourceStop')) handler('redisfx');

    expect(sub().ops()).not.toContain('unsubscribe');
  });

  test('closeSubscriber destroys the connection and clears the registry', async () => {
    await subscribe('alpha', ['chan'], {});
    const subscriber = sub();

    closeSubscriber();
    expect(subscriber.destroyed).toBe(1);

    // a fresh subscribe must build a new connection
    await subscribe('alpha', ['chan'], {});
    expect(client.duplicates).toHaveLength(2);
  });
});

describe('failure paths', () => {
  test('a subscriber that cannot connect does not become the cached connection', async () => {
    // The first duplicate is created and fails to connect; a later subscribe must build a new one
    // rather than reusing the dead handle.
    client.duplicateFailure = new Error('ECONNREFUSED');

    await expect(subscribe('res', ['chan'], {})).rejects.toThrow('ECONNREFUSED');

    client.duplicateFailure = undefined;
    await expect(subscribe('res', ['chan'], {})).resolves.toBe(true);
    expect(client.duplicates).toHaveLength(2);
  });

  test('an unsubscribe failure is reported through the callback in promise mode', async () => {
    await subscribe('res', ['chan'], {});
    sub().failures.unsubscribe = new Error('cannot leave');

    const seen: unknown[][] = [];
    await expect(
      unsubscribe('res', ['chan'], {}, (r: unknown, e?: string) => seen.push([r, e]), true),
    ).resolves.toBeUndefined();

    expect(String(seen[0][1])).toContain('cannot leave');
  });

  test('an unsubscribe failure rethrows without a promise-mode callback', async () => {
    await subscribe('res', ['chan2'], {});
    sub().failures.unsubscribe = new Error('cannot leave');

    await expect(unsubscribe('res', ['chan2'], {})).rejects.toThrow('cannot leave');
  });
});
