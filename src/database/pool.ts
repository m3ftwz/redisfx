import { getConnectionOptions } from 'config';
import { createClient, type RedisClientType } from 'redis';

export let client: RedisClientType;
export let redisVersion = '';

/** Only the first failure of a streak is printed in full; the rest are counted. */
let suppressedErrors = 0;
let lastErrorMessage = '';

function logClientError(message: string) {
  if (message === lastErrorMessage) {
    suppressedErrors += 1;
    if (suppressedErrors % 50 !== 0) return;
    return console.log(`^3Redis Client Error: ${message} (repeated ${suppressedErrors} times)^0`);
  }

  lastErrorMessage = message;
  suppressedErrors = 0;
  console.log(`^3Redis Client Error: ${message}^0`);
}

export async function createRedisClient() {
  let config;

  try {
    // Reading the convar can throw when it is unset or malformed. Keep that inside the caller's
    // retry loop rather than letting it reject and kill the loop entirely.
    config = getConnectionOptions();
  } catch (err: any) {
    console.log(`^1${err.message}^0`);
    return;
  }

  let redisClient: ReturnType<typeof createClient> | undefined;

  try {
    redisClient = createClient(config);

    redisClient.on('error', (err) => logClientError(err.message));
    redisClient.on('reconnecting', () => {
      if (client) console.log('^3Redis client reconnecting...^0');
    });

    await redisClient.connect();

    const pong = await redisClient.ping();
    if (pong !== 'PONG') throw new Error('Failed to receive PONG from Redis server');

    const info = await redisClient.info('server');
    const versionMatch = info.match(/redis_version:(\S+)/);
    redisVersion = versionMatch ? `^5[Redis ${versionMatch[1]}]` : '^5[Redis]';

    lastErrorMessage = '';
    suppressedErrors = 0;

    console.log(`${redisVersion} ^2Redis server connection established!^0`);

    // node-redis owns reconnection from here on, so this only ever runs once per successful boot.
    client = redisClient as unknown as RedisClientType;
  } catch (err: any) {
    // Tear the half-open client down, otherwise it keeps its own reconnect loop running
    // alongside the new client the caller is about to create.
    // destroy() is synchronous in node-redis v6 and throws if the socket is already gone.
    try {
      redisClient?.destroy();
    } catch {}

    console.log(`^3Unable to establish a connection to Redis!\n^1Error: ${err.message}^0`);
    console.log({ ...config, password: config.password ? '******' : undefined });
  }
}
