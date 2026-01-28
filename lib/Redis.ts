type Callback<T> = (result: T | null) => void;

interface SetOptions {
  EX?: number;
  PX?: number;
  EXAT?: number;
  PXAT?: number;
  NX?: boolean;
  XX?: boolean;
  KEEPTTL?: boolean;
  GET?: boolean;
}

interface ZAddOptions {
  NX?: boolean;
  XX?: boolean;
  GT?: boolean;
  LT?: boolean;
  CH?: boolean;
}

interface ScanOptions {
  MATCH?: string;
  COUNT?: number;
}

interface RedisFX {
  // Connection
  isReady: () => boolean;
  awaitConnection: () => Promise<true>;
  ready: (callback: () => void) => void;

  // String commands
  get: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  set: <T = string | null>(key: string, value: string | number, options?: SetOptions | Callback<T>, cb?: Callback<T>) => Promise<T>;
  del: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  exists: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  expire: <T = number>(key: string, seconds: number, cb?: Callback<T>) => Promise<T>;
  ttl: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  incr: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  incrby: <T = number>(key: string, increment: number, cb?: Callback<T>) => Promise<T>;
  decr: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  decrby: <T = number>(key: string, decrement: number, cb?: Callback<T>) => Promise<T>;
  mget: <T = (string | null)[]>(keys: string[], cb?: Callback<T>) => Promise<T>;
  mset: <T = string>(keyValues: Record<string, string | number>, cb?: Callback<T>) => Promise<T>;

  // Hash commands
  hget: <T = string | null>(key: string, field: string, cb?: Callback<T>) => Promise<T>;
  hset: <T = number>(key: string, field: string, value: string | number, cb?: Callback<T>) => Promise<T>;
  hmset: <T = number>(key: string, fieldValues: Record<string, string | number>, cb?: Callback<T>) => Promise<T>;
  hgetall: <T = Record<string, string>>(key: string, cb?: Callback<T>) => Promise<T>;
  hdel: <T = number>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  hincrby: <T = number>(key: string, field: string, increment: number, cb?: Callback<T>) => Promise<T>;
  hexists: <T = number>(key: string, field: string, cb?: Callback<T>) => Promise<T>;
  hkeys: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  hvals: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  hlen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;

  // List commands
  lpush: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  rpush: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  lpop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  rpop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  lrange: <T = string[]>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  llen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  lindex: <T = string | null>(key: string, index: number, cb?: Callback<T>) => Promise<T>;
  lset: <T = string>(key: string, index: number, value: string, cb?: Callback<T>) => Promise<T>;
  lrem: <T = number>(key: string, count: number, value: string, cb?: Callback<T>) => Promise<T>;

  // Set commands
  sadd: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  srem: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  smembers: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  sismember: <T = number>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  scard: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  spop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  srandmember: <T = string | string[] | null>(key: string, count?: number | Callback<T>, cb?: Callback<T>) => Promise<T>;

  // Sorted set commands
  zadd: <T = number>(key: string, score: number, member: string, options?: ZAddOptions | Callback<T>, cb?: Callback<T>) => Promise<T>;
  zrange: <T = string[]>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  zrangeWithScores: <T = string[]>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  zrem: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  zscore: <T = string | null>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  zrank: <T = number | null>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  zcard: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  zincrby: <T = string>(key: string, increment: number, member: string, cb?: Callback<T>) => Promise<T>;

  // Transaction commands
  multi: <T = any[]>(commands: { command: string; args: any[] }[], cb?: Callback<T>) => Promise<T>;

  // Key commands
  keys: <T = string[]>(pattern: string, cb?: Callback<T>) => Promise<T>;
  scan: <T = [string, string[]]>(cursor: number, options?: ScanOptions | Callback<T>, cb?: Callback<T>) => Promise<T>;
  type: <T = string>(key: string, cb?: Callback<T>) => Promise<T>;
  rename: <T = string>(key: string, newKey: string, cb?: Callback<T>) => Promise<T>;
  persist: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  pttl: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  expireat: <T = number>(key: string, timestamp: number, cb?: Callback<T>) => Promise<T>;

  // Server commands
  ping: <T = string>(cb?: Callback<T>) => Promise<T>;
  flushdb: <T = string>(cb?: Callback<T>) => Promise<T>;
  dbsize: <T = number>(cb?: Callback<T>) => Promise<T>;

  // Raw command
  raw: <T = any>(command: string, args: any[], cb?: Callback<T>) => Promise<T>;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new TypeError(message);
}

const safeArgs = (arg1: any, arg2?: any, cb?: Function) => {
  if (arg2 !== undefined) {
    const arg2Type = typeof arg2;
    if (arg2Type === 'function') {
      cb = arg2;
      arg2 = undefined;
    }
  }

  if (cb !== undefined) assert(typeof cb === 'function', `Callback expected function, received ${typeof cb}`);

  return [arg1, arg2, cb];
};

declare var global: any;
const exp = global.exports['redisfx'];
const currentResourceName = GetCurrentResourceName();

function execute(method: string, ...args: any[]) {
  return new Promise((resolve, reject) => {
    exp[method](
      ...args,
      (result: any, error: any) => {
        if (error) return reject(error);
        resolve(result);
      },
      currentResourceName,
      true
    );
  }) as any;
}

export const redisfx: RedisFX = {
  isReady() {
    return exp.isReady();
  },
  async awaitConnection() {
    return await exp.awaitConnection();
  },
  ready(callback) {
    setImmediate(async () => {
      while (GetResourceState('redisfx') !== 'started') await new Promise((resolve) => setTimeout(resolve, 50, null));
      callback();
    });
  },

  // String commands
  async get(key, cb) {
    const result = await execute('get', key);
    return cb ? cb(result) : result;
  },
  async set(key, value, options, cb) {
    [options, , cb] = safeArgs(options, cb);
    const result = await execute('set', key, value, options);
    return cb ? cb(result) : result;
  },
  async del(keys, cb) {
    const result = await execute('del', keys);
    return cb ? cb(result) : result;
  },
  async exists(keys, cb) {
    const result = await execute('exists', keys);
    return cb ? cb(result) : result;
  },
  async expire(key, seconds, cb) {
    const result = await execute('expire', key, seconds);
    return cb ? cb(result) : result;
  },
  async ttl(key, cb) {
    const result = await execute('ttl', key);
    return cb ? cb(result) : result;
  },
  async incr(key, cb) {
    const result = await execute('incr', key);
    return cb ? cb(result) : result;
  },
  async incrby(key, increment, cb) {
    const result = await execute('incrby', key, increment);
    return cb ? cb(result) : result;
  },
  async decr(key, cb) {
    const result = await execute('decr', key);
    return cb ? cb(result) : result;
  },
  async decrby(key, decrement, cb) {
    const result = await execute('decrby', key, decrement);
    return cb ? cb(result) : result;
  },
  async mget(keys, cb) {
    const result = await execute('mget', keys);
    return cb ? cb(result) : result;
  },
  async mset(keyValues, cb) {
    const result = await execute('mset', keyValues);
    return cb ? cb(result) : result;
  },

  // Hash commands
  async hget(key, field, cb) {
    const result = await execute('hget', key, field);
    return cb ? cb(result) : result;
  },
  async hset(key, field, value, cb) {
    const result = await execute('hset', key, field, value);
    return cb ? cb(result) : result;
  },
  async hmset(key, fieldValues, cb) {
    const result = await execute('hmset', key, fieldValues);
    return cb ? cb(result) : result;
  },
  async hgetall(key, cb) {
    const result = await execute('hgetall', key);
    return cb ? cb(result) : result;
  },
  async hdel(key, fields, cb) {
    const result = await execute('hdel', key, fields);
    return cb ? cb(result) : result;
  },
  async hincrby(key, field, increment, cb) {
    const result = await execute('hincrby', key, field, increment);
    return cb ? cb(result) : result;
  },
  async hexists(key, field, cb) {
    const result = await execute('hexists', key, field);
    return cb ? cb(result) : result;
  },
  async hkeys(key, cb) {
    const result = await execute('hkeys', key);
    return cb ? cb(result) : result;
  },
  async hvals(key, cb) {
    const result = await execute('hvals', key);
    return cb ? cb(result) : result;
  },
  async hlen(key, cb) {
    const result = await execute('hlen', key);
    return cb ? cb(result) : result;
  },

  // List commands
  async lpush(key, values, cb) {
    const result = await execute('lpush', key, values);
    return cb ? cb(result) : result;
  },
  async rpush(key, values, cb) {
    const result = await execute('rpush', key, values);
    return cb ? cb(result) : result;
  },
  async lpop(key, cb) {
    const result = await execute('lpop', key);
    return cb ? cb(result) : result;
  },
  async rpop(key, cb) {
    const result = await execute('rpop', key);
    return cb ? cb(result) : result;
  },
  async lrange(key, start, stop, cb) {
    const result = await execute('lrange', key, start, stop);
    return cb ? cb(result) : result;
  },
  async llen(key, cb) {
    const result = await execute('llen', key);
    return cb ? cb(result) : result;
  },
  async lindex(key, index, cb) {
    const result = await execute('lindex', key, index);
    return cb ? cb(result) : result;
  },
  async lset(key, index, value, cb) {
    const result = await execute('lset', key, index, value);
    return cb ? cb(result) : result;
  },
  async lrem(key, count, value, cb) {
    const result = await execute('lrem', key, count, value);
    return cb ? cb(result) : result;
  },

  // Set commands
  async sadd(key, members, cb) {
    const result = await execute('sadd', key, members);
    return cb ? cb(result) : result;
  },
  async srem(key, members, cb) {
    const result = await execute('srem', key, members);
    return cb ? cb(result) : result;
  },
  async smembers(key, cb) {
    const result = await execute('smembers', key);
    return cb ? cb(result) : result;
  },
  async sismember(key, member, cb) {
    const result = await execute('sismember', key, member);
    return cb ? cb(result) : result;
  },
  async scard(key, cb) {
    const result = await execute('scard', key);
    return cb ? cb(result) : result;
  },
  async spop(key, cb) {
    const result = await execute('spop', key);
    return cb ? cb(result) : result;
  },
  async srandmember(key, count, cb) {
    [count, , cb] = safeArgs(count, cb);
    const result = count !== undefined ? await execute('srandmember', key, count) : await execute('srandmember', key);
    return cb ? cb(result) : result;
  },

  // Sorted set commands
  async zadd(key, score, member, options, cb) {
    [options, , cb] = safeArgs(options, cb);
    const result = await execute('zadd', key, score, member, options);
    return cb ? cb(result) : result;
  },
  async zrange(key, start, stop, cb) {
    const result = await execute('zrange', key, start, stop);
    return cb ? cb(result) : result;
  },
  async zrangeWithScores(key, start, stop, cb) {
    const result = await execute('zrangeWithScores', key, start, stop);
    return cb ? cb(result) : result;
  },
  async zrem(key, members, cb) {
    const result = await execute('zrem', key, members);
    return cb ? cb(result) : result;
  },
  async zscore(key, member, cb) {
    const result = await execute('zscore', key, member);
    return cb ? cb(result) : result;
  },
  async zrank(key, member, cb) {
    const result = await execute('zrank', key, member);
    return cb ? cb(result) : result;
  },
  async zcard(key, cb) {
    const result = await execute('zcard', key);
    return cb ? cb(result) : result;
  },
  async zincrby(key, increment, member, cb) {
    const result = await execute('zincrby', key, increment, member);
    return cb ? cb(result) : result;
  },

  // Transaction
  async multi(commands, cb) {
    const result = await execute('multi', commands);
    return cb ? cb(result) : result;
  },

  // Key commands
  async keys(pattern, cb) {
    const result = await execute('keys', pattern);
    return cb ? cb(result) : result;
  },
  async scan(cursor, options, cb) {
    [options, , cb] = safeArgs(options, cb);
    const result = await execute('scan', cursor, options);
    return cb ? cb(result) : result;
  },
  async type(key, cb) {
    const result = await execute('type', key);
    return cb ? cb(result) : result;
  },
  async rename(key, newKey, cb) {
    const result = await execute('rename', key, newKey);
    return cb ? cb(result) : result;
  },
  async persist(key, cb) {
    const result = await execute('persist', key);
    return cb ? cb(result) : result;
  },
  async pttl(key, cb) {
    const result = await execute('pttl', key);
    return cb ? cb(result) : result;
  },
  async expireat(key, timestamp, cb) {
    const result = await execute('expireat', key, timestamp);
    return cb ? cb(result) : result;
  },

  // Server commands
  async ping(cb) {
    const result = await execute('ping');
    return cb ? cb(result) : result;
  },
  async flushdb(cb) {
    const result = await execute('flushdb');
    return cb ? cb(result) : result;
  },
  async dbsize(cb) {
    const result = await execute('dbsize');
    return cb ? cb(result) : result;
  },

  // Raw command
  async raw(command, args, cb) {
    const result = await execute('raw', command, args);
    return cb ? cb(result) : result;
  },
};
