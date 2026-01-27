import { getConnectionOptions } from 'config';
import { createClient, RedisClientType } from 'redis';

export let client: RedisClientType;
export let redisVersion = '';

export async function createRedisClient() {
  const config = getConnectionOptions();

  try {
    const redisClient = createClient({
      username: config.username,
      password: config.password,
      socket: config.socket,
      database: config.database,
    });

    redisClient.on('error', (err) => {
      console.log(`^3Redis Client Error: ${err.message}^0`);
    });

    redisClient.on('reconnecting', () => {
      console.log('^3Redis client reconnecting...^0');
    });

    await redisClient.connect();

    // Test connection with PING
    const pong = await redisClient.ping();
    if (pong !== 'PONG') {
      throw new Error('Failed to receive PONG from Redis server');
    }

    // Get Redis version info
    const info = await redisClient.info('server');
    const versionMatch = info.match(/redis_version:(\S+)/);
    redisVersion = versionMatch ? `^5[Redis ${versionMatch[1]}]` : '^5[Redis]';

    console.log(`${redisVersion} ^2Redis server connection established!^0`);

    client = redisClient as RedisClientType;
  } catch (err: any) {
    console.log(
      `^3Unable to establish a connection to Redis!\n^1Error: ${err.message}^0`
    );

    // Log sanitized config (hide password)
    const sanitizedConfig = { ...config };
    if (sanitizedConfig.password) sanitizedConfig.password = '******';
    console.log(sanitizedConfig);
  }
}
