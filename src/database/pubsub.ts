import type { RedisClientType } from 'redis';
import { client } from './pool';
import { logError } from '../logger';
import { sleep } from '../utils/sleep';
import { scheduleTick } from '../utils/scheduleTick';
import type { CFXCallback } from '../types';

/**
 * A connection in subscriber mode may only issue (P|S)SUBSCRIBE/UNSUBSCRIBE, so pub/sub runs on a
 * dedicated duplicate of the main client. It is created on first use and torn down with the
 * resource.
 */
let subscriber: RedisClientType | undefined;
let connecting: Promise<RedisClientType> | undefined;

export type SubscribeMode = 'channel' | 'pattern' | 'sharded';

/** mode -> channel -> resources that asked for it, so one resource cannot unsubscribe another. */
const subscriptions: Record<SubscribeMode, Map<string, Set<string>>> = {
  channel: new Map(),
  pattern: new Map(),
  sharded: new Map(),
};

function modeOf(options: { pattern?: boolean; sharded?: boolean }): SubscribeMode {
  if (options.pattern) return 'pattern';
  if (options.sharded) return 'sharded';
  return 'channel';
}

async function getSubscriber() {
  if (subscriber) return subscriber;
  if (connecting) return connecting;

  connecting = (async () => {
    while (!client) await sleep(0);

    const duplicate = client.duplicate() as RedisClientType;

    duplicate.on('error', (err) => console.log(`^3Redis Subscriber Error: ${err.message}^0`));

    await duplicate.connect();

    subscriber = duplicate;
    connecting = undefined;

    return duplicate;
  })();

  try {
    return await connecting;
  } catch (err) {
    connecting = undefined;
    throw err;
  }
}

function listenerFor(mode: SubscribeMode) {
  return (message: string, channel: string) => {
    scheduleTick();
    // Delivered as a server event so any resource can consume it without holding a JS callback
    // across the export boundary.
    emit('redisfx:message', channel, message, mode);
  };
}

const SUBSCRIBE_FN = {
  channel: 'subscribe',
  pattern: 'pSubscribe',
  sharded: 'sSubscribe',
} as const;

const UNSUBSCRIBE_FN = {
  channel: 'unsubscribe',
  pattern: 'pUnsubscribe',
  sharded: 'sUnsubscribe',
} as const;

export async function subscribe(
  invokingResource: string,
  channels: string[],
  options: { pattern?: boolean; sharded?: boolean },
  cb?: CFXCallback,
  isPromise?: boolean,
) {
  const mode = modeOf(options);

  try {
    const conn = await getSubscriber();
    const registry = subscriptions[mode];
    const pending: string[] = [];

    for (const channel of channels) {
      const owners = registry.get(channel);

      if (owners) {
        owners.add(invokingResource);
        continue;
      }

      registry.set(channel, new Set([invokingResource]));
      pending.push(channel);
    }

    if (pending.length) {
      await (conn as any)[SUBSCRIBE_FN[mode]](pending, listenerFor(mode));
    }

    if (cb) cb(true);

    return true;
  } catch (err: any) {
    // Do not leave a half-registered channel behind - the next subscribe would think it is live.
    for (const channel of channels) {
      const owners = subscriptions[mode].get(channel);
      if (owners?.delete(invokingResource) && owners.size === 0) subscriptions[mode].delete(channel);
    }

    logError(invokingResource, cb, isPromise, err, `SUBSCRIBE (${mode})`, channels);

    if (cb && isPromise) return;

    throw err;
  }
}

export async function unsubscribe(
  invokingResource: string,
  channels: string[],
  options: { pattern?: boolean; sharded?: boolean },
  cb?: CFXCallback,
  isPromise?: boolean,
) {
  const mode = modeOf(options);

  try {
    const registry = subscriptions[mode];
    const dropped: string[] = [];

    for (const channel of channels) {
      const owners = registry.get(channel);
      if (!owners) continue;

      owners.delete(invokingResource);

      // Only leave the channel once no resource is still listening on it.
      if (owners.size === 0) {
        registry.delete(channel);
        dropped.push(channel);
      }
    }

    if (dropped.length && subscriber) {
      await (subscriber as any)[UNSUBSCRIBE_FN[mode]](dropped);
    }

    if (cb) cb(true);

    return true;
  } catch (err: any) {
    logError(invokingResource, cb, isPromise, err, `UNSUBSCRIBE (${mode})`, channels);

    if (cb && isPromise) return;

    throw err;
  }
}

/** Drops every subscription owned by a resource that stopped. */
export async function releaseResource(invokingResource: string) {
  for (const mode of Object.keys(subscriptions) as SubscribeMode[]) {
    const registry = subscriptions[mode];
    const dropped: string[] = [];

    for (const [channel, owners] of registry) {
      owners.delete(invokingResource);
      if (owners.size === 0) {
        registry.delete(channel);
        dropped.push(channel);
      }
    }

    if (dropped.length && subscriber) {
      await (subscriber as any)[UNSUBSCRIBE_FN[mode]](dropped).catch(() => {});
    }
  }
}

export function closeSubscriber() {
  for (const mode of Object.keys(subscriptions) as SubscribeMode[]) subscriptions[mode].clear();

  try {
    subscriber?.destroy();
  } catch {}

  subscriber = undefined;
  connecting = undefined;
}

on('onResourceStop', (resource: string) => {
  if (resource !== GetCurrentResourceName()) releaseResource(resource);
});
