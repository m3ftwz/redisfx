export const redis_connection_string = GetConvar('redis_connection_string', '');
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

function parseRedisUrl(connectionString: string) {
  // Redis URL format: redis://[[username:]password@]host[:port][/database]
  const url = new URL(connectionString);

  return {
    username: url.username || undefined,
    password: url.password || undefined,
    socket: {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port) : 6379,
    },
    database: url.pathname ? parseInt(url.pathname.replace('/', '')) || 0 : 0,
  };
}

export function getConnectionOptions() {
  if (!redis_connection_string) {
    throw new Error('redis_connection_string is not set');
  }

  if (redis_connection_string.startsWith('redis://') || redis_connection_string.startsWith('rediss://')) {
    return parseRedisUrl(redis_connection_string);
  }

  // Support simple key=value format
  const options: Record<string, any> = redis_connection_string
    .replace(/(?:host(?:name)?|server)=/gi, 'host=')
    .replace(/(?:pwd|pass(?:word)?)=/gi, 'password=')
    .replace(/(?:db|database)=/gi, 'database=')
    .split(';')
    .reduce<Record<string, string>>((connectionInfo, parameter) => {
      const [key, value] = parameter.split('=');
      if (key) connectionInfo[key.trim()] = value?.trim();
      return connectionInfo;
    }, {});

  return {
    username: options.username || options.user || undefined,
    password: options.password || undefined,
    socket: {
      host: options.host || 'localhost',
      port: options.port ? parseInt(options.port) : 6379,
    },
    database: options.database ? parseInt(options.database) : 0,
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
        return console.log(`^3Usage: redisfx add|remove <resource>^0`);
    }
  },
  true
);
