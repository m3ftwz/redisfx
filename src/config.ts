// Read lazily: the convar may be set after this module is first evaluated, and reading it
// on demand keeps the value correct across a resource restart.
export const getConnectionString = () => GetConvar('redis_connection_string', '');
export let redis_ui = GetConvar('redis_ui', 'false') === 'true';
export let redis_slow_query_warning = GetConvarInt('redis_slow_query_warning', 200);
export let redis_debug: boolean | string[] = false;

// max array size of individual resource command logs
// prevent excessive memory use when people use debug/ui in production
export let redis_log_size = 0;

export function setDebug() {
  redis_ui = GetConvar('redis_ui', 'false') === 'true';
  redis_slow_query_warning = GetConvarInt('redis_slow_query_warning', 200);

  try {
    const debug = GetConvar('redis_debug', 'false');
    redis_debug = debug === 'false' ? false : JSON.parse(debug);
  } catch (e) {
    redis_debug = true;
  }

  redis_log_size = redis_debug ? 10000 : GetConvarInt('redis_log_size', 100);
}

export interface RedisConnectionOptions {
  username?: string;
  password?: string;
  socket: { host: string; port: number; tls?: true; reconnectStrategy?: (retries: number) => number };
  database: number;
  RESP?: 2 | 3;
  commandOptions?: { timeout?: number };
}

/**
 * node-redis rejects a queued command once it has waited this long to reach the socket. It does
 * not bound how long the server may take to answer a command that was already sent, so this is a
 * "redis is unreachable" deadline rather than a slow-command deadline.
 */
function getCommandTimeout() {
  const timeout = GetConvarInt('redis_command_timeout', 5000);
  return timeout > 0 ? timeout : undefined;
}

/** RESP3 is the node-redis v6 default; allow pinning RESP2 for servers that cannot negotiate it. */
function getRespVersion(): 2 | 3 {
  return GetConvarInt('redis_resp', 3) === 2 ? 2 : 3;
}

/** Retry forever with a capped backoff instead of node-redis' unbounded linear growth. */
function reconnectStrategy(retries: number) {
  return Math.min(200 * 2 ** Math.min(retries, 6), 30000);
}

function parseRedisUrl(connectionString: string): RedisConnectionOptions {
  // redis://[[username:]password@]host[:port][/database]
  const url = new URL(connectionString);
  const tls = url.protocol === 'rediss:';
  const database = parseInt(url.pathname.replace('/', ''), 10);

  return {
    // URL credentials are percent-encoded; node-redis expects them decoded.
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    socket: {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port, 10) : 6379,
      ...(tls ? { tls: true as const } : {}),
      reconnectStrategy,
    },
    database: Number.isNaN(database) ? 0 : database,
    RESP: getRespVersion(),
    commandOptions: { timeout: getCommandTimeout() },
  };
}

export function getConnectionOptions(): RedisConnectionOptions {
  const redis_connection_string = getConnectionString();

  if (!redis_connection_string) {
    throw new Error(
      'redis_connection_string is not set - add `set redis_connection_string "redis://localhost:6379"` to your server.cfg',
    );
  }

  if (redis_connection_string.startsWith('redis://') || redis_connection_string.startsWith('rediss://')) {
    return parseRedisUrl(redis_connection_string);
  }

  // Support simple key=value format
  const options: Record<string, string> = redis_connection_string
    .replace(/(?:host(?:name)?|server)=/gi, 'host=')
    .replace(/(?:pwd|pass(?:word)?)=/gi, 'password=')
    .replace(/(?:db|database)=/gi, 'database=')
    .split(';')
    .reduce<Record<string, string>>((connectionInfo, parameter) => {
      const [key, value] = parameter.split('=');
      if (key) connectionInfo[key.trim()] = value?.trim();
      return connectionInfo;
    }, {});

  const database = parseInt(options.database, 10);
  const tls = options.tls === 'true' || options.ssl === 'true';

  return {
    username: options.username || options.user || undefined,
    password: options.password || undefined,
    socket: {
      host: options.host || 'localhost',
      port: options.port ? parseInt(options.port, 10) : 6379,
      ...(tls ? { tls: true as const } : {}),
      reconnectStrategy,
    },
    database: Number.isNaN(database) ? 0 : database,
    RESP: getRespVersion(),
    commandOptions: { timeout: getCommandTimeout() },
  };
}

RegisterCommand(
  'redisfx_debug',
  (source: number, args: string[]) => {
    if (source !== 0) return console.log('^3This command can only be run server side^0');
    switch (args[0]) {
      case 'add':
        if (!Array.isArray(redis_debug)) redis_debug = [];
        redis_debug.push(args[1]);
        SetConvar('redis_debug', JSON.stringify(redis_debug));
        return console.log(`^3Added ${args[1]} to redis_debug^0`);

      case 'remove':
        if (Array.isArray(redis_debug)) {
          const index = redis_debug.indexOf(args[1]);
          if (index === -1) return;
          redis_debug.splice(index, 1);
          if (redis_debug.length === 0) redis_debug = false;
          SetConvar('redis_debug', JSON.stringify(redis_debug) || 'false');
          return console.log(`^3Removed ${args[1]} from redis_debug^0`);
        }

      default:
        return console.log(`^3Usage: redisfx_debug add|remove <resource>^0`);
    }
  },
  true,
);
