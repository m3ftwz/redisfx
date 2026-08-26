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
  TYPE?: string;
}

interface SubscribeOptions {
  /** Treat the channels as glob patterns (PSUBSCRIBE). */
  pattern?: boolean;
  /** Use sharded pub/sub (SSUBSCRIBE, Redis 7.0+). */
  sharded?: boolean;
}

/** Cursor reply shared by SCAN/HSCAN/SSCAN/ZSCAN. */
interface ScanReply {
  cursor: string;
  keys: string[];
}

interface ScoredMember {
  value: string;
  score: number;
}

interface RedisFX {
  // Connection
  isReady: () => boolean;
  awaitConnection: () => Promise<true>;
  ready: (callback: () => void) => void;

  // String commands
  get: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  set: <T = string | null>(
    key: string,
    value: string | number,
    options?: SetOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  getdel: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  getex: <T = string | null>(key: string, options?: SetOptions | Callback<T>, cb?: Callback<T>) => Promise<T>;
  getrange: <T = string>(key: string, start: number, end: number, cb?: Callback<T>) => Promise<T>;
  setrange: <T = number>(key: string, offset: number, value: string, cb?: Callback<T>) => Promise<T>;
  append: <T = number>(key: string, value: string, cb?: Callback<T>) => Promise<T>;
  strlen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  setnx: <T = boolean>(key: string, value: string | number, cb?: Callback<T>) => Promise<T>;
  incr: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  incrby: <T = number>(key: string, increment: number, cb?: Callback<T>) => Promise<T>;
  incrbyfloat: <T = string>(key: string, increment: number, cb?: Callback<T>) => Promise<T>;
  decr: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  decrby: <T = number>(key: string, decrement: number, cb?: Callback<T>) => Promise<T>;
  mget: <T = (string | null)[]>(keys: string[], cb?: Callback<T>) => Promise<T>;
  mset: <T = string>(keyValues: Record<string, string | number>, cb?: Callback<T>) => Promise<T>;
  msetnx: <T = boolean>(keyValues: Record<string, string | number>, cb?: Callback<T>) => Promise<T>;

  // Key commands
  del: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  unlink: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  exists: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  touch: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  expire: <T = boolean>(key: string, seconds: number, cb?: Callback<T>) => Promise<T>;
  pexpire: <T = boolean>(key: string, milliseconds: number, cb?: Callback<T>) => Promise<T>;
  expireat: <T = boolean>(key: string, timestamp: number, cb?: Callback<T>) => Promise<T>;
  pexpireat: <T = boolean>(key: string, timestamp: number, cb?: Callback<T>) => Promise<T>;
  expiretime: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  pexpiretime: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  ttl: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  pttl: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  persist: <T = boolean>(key: string, cb?: Callback<T>) => Promise<T>;
  type: <T = string>(key: string, cb?: Callback<T>) => Promise<T>;
  rename: <T = string>(key: string, newKey: string, cb?: Callback<T>) => Promise<T>;
  renamenx: <T = boolean>(key: string, newKey: string, cb?: Callback<T>) => Promise<T>;
  randomkey: <T = string | null>(cb?: Callback<T>) => Promise<T>;
  keys: <T = string[]>(pattern: string, cb?: Callback<T>) => Promise<T>;
  copy: <T = boolean>(
    source: string,
    destination: string,
    options?: { DB?: number; REPLACE?: boolean } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  scan: <T = ScanReply>(cursor: string | number, options?: ScanOptions | Callback<T>, cb?: Callback<T>) => Promise<T>;
  objectEncoding: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  memoryUsage: <T = number | null>(key: string, cb?: Callback<T>) => Promise<T>;
  dump: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  restore: <T = string>(key: string, ttl: number, serialized: string, cb?: Callback<T>) => Promise<T>;

  // Hash commands
  hget: <T = string | null>(key: string, field: string, cb?: Callback<T>) => Promise<T>;
  hset: <T = number>(key: string, field: string, value: string | number, cb?: Callback<T>) => Promise<T>;
  hsetnx: <T = boolean>(key: string, field: string, value: string | number, cb?: Callback<T>) => Promise<T>;
  hmset: <T = number>(key: string, fieldValues: Record<string, string | number>, cb?: Callback<T>) => Promise<T>;
  hgetall: <T = Record<string, string>>(key: string, cb?: Callback<T>) => Promise<T>;
  hmget: <T = (string | null)[]>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  hdel: <T = number>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  hincrby: <T = number>(key: string, field: string, increment: number, cb?: Callback<T>) => Promise<T>;
  hincrbyfloat: <T = string>(key: string, field: string, increment: number, cb?: Callback<T>) => Promise<T>;
  hexists: <T = boolean>(key: string, field: string, cb?: Callback<T>) => Promise<T>;
  hkeys: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  hvals: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  hlen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  hstrlen: <T = number>(key: string, field: string, cb?: Callback<T>) => Promise<T>;
  hrandfield: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  hscan: <T = ScanReply>(
    key: string,
    cursor: string | number,
    options?: ScanOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;

  // Hash field expiration (Redis 7.4+)
  hexpire: <T = number[]>(key: string, fields: string | string[], seconds: number, cb?: Callback<T>) => Promise<T>;
  hpexpire: <T = number[]>(
    key: string,
    fields: string | string[],
    milliseconds: number,
    cb?: Callback<T>,
  ) => Promise<T>;
  hexpireat: <T = number[]>(key: string, fields: string | string[], timestamp: number, cb?: Callback<T>) => Promise<T>;
  hpexpireat: <T = number[]>(key: string, fields: string | string[], timestamp: number, cb?: Callback<T>) => Promise<T>;
  httl: <T = number[]>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  hpttl: <T = number[]>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  hpersist: <T = number[]>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;
  /** HGETEX (Redis 8.0+) - read fields and optionally reset their TTL. */
  hgetex: <T = (string | null)[]>(
    key: string,
    fields: string | string[],
    options?: SetOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  /** HGETDEL (Redis 8.0+) - read fields and delete them atomically. */
  hgetdel: <T = (string | null)[]>(key: string, fields: string | string[], cb?: Callback<T>) => Promise<T>;

  // List commands
  lpush: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  rpush: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  lpushx: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  rpushx: <T = number>(key: string, values: string | string[], cb?: Callback<T>) => Promise<T>;
  lpop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  rpop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  lrange: <T = string[]>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  llen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  lindex: <T = string | null>(key: string, index: number, cb?: Callback<T>) => Promise<T>;
  lset: <T = string>(key: string, index: number, value: string, cb?: Callback<T>) => Promise<T>;
  lrem: <T = number>(key: string, count: number, value: string, cb?: Callback<T>) => Promise<T>;
  ltrim: <T = string>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  lpos: <T = number | null>(
    key: string,
    element: string,
    options?: { RANK?: number; COUNT?: number; MAXLEN?: number } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  linsert: <T = number>(
    key: string,
    position: 'BEFORE' | 'AFTER',
    pivot: string,
    element: string,
    cb?: Callback<T>,
  ) => Promise<T>;
  lmove: <T = string | null>(
    source: string,
    destination: string,
    from: 'LEFT' | 'RIGHT',
    to: 'LEFT' | 'RIGHT',
    cb?: Callback<T>,
  ) => Promise<T>;
  rpoplpush: <T = string | null>(source: string, destination: string, cb?: Callback<T>) => Promise<T>;
  lmpop: <T = { key: string; elements: string[] } | null>(
    keys: string | string[],
    side: 'LEFT' | 'RIGHT',
    options?: { COUNT?: number } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;

  // Set commands
  sadd: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  srem: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  smembers: <T = string[]>(key: string, cb?: Callback<T>) => Promise<T>;
  sismember: <T = boolean>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  smismember: <T = boolean[]>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  scard: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  spop: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  smove: <T = boolean>(source: string, destination: string, member: string, cb?: Callback<T>) => Promise<T>;
  srandmember: <T = string | null>(key: string, count?: number | Callback<T>, cb?: Callback<T>) => Promise<T>;
  sinter: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sunion: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sdiff: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sintercard: <T = number>(
    keys: string | string[],
    options?: { LIMIT?: number } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  sinterstore: <T = number>(destination: string, keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sunionstore: <T = number>(destination: string, keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sdiffstore: <T = number>(destination: string, keys: string | string[], cb?: Callback<T>) => Promise<T>;
  sscan: <T = ScanReply>(
    key: string,
    cursor: string | number,
    options?: ScanOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;

  // Sorted set commands
  zadd: <T = number>(
    key: string,
    score: number,
    member: string,
    options?: ZAddOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  zrange: <T = string[]>(key: string, start: number | string, stop: number | string, cb?: Callback<T>) => Promise<T>;
  zrangeWithScores: <T = ScoredMember[]>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  zrangebyscore: <T = string[]>(
    key: string,
    min: number | string,
    max: number | string,
    cb?: Callback<T>,
  ) => Promise<T>;
  zrangestore: <T = number>(
    destination: string,
    source: string,
    min: number | string,
    max: number | string,
    cb?: Callback<T>,
  ) => Promise<T>;
  zrem: <T = number>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  zscore: <T = number | null>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  zmscore: <T = (number | null)[]>(key: string, members: string | string[], cb?: Callback<T>) => Promise<T>;
  zrank: <T = number | null>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  zrevrank: <T = number | null>(key: string, member: string, cb?: Callback<T>) => Promise<T>;
  zcard: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  zcount: <T = number>(key: string, min: number | string, max: number | string, cb?: Callback<T>) => Promise<T>;
  zlexcount: <T = number>(key: string, min: string, max: string, cb?: Callback<T>) => Promise<T>;
  zincrby: <T = number>(key: string, increment: number, member: string, cb?: Callback<T>) => Promise<T>;
  zpopmin: <T = ScoredMember | null>(key: string, cb?: Callback<T>) => Promise<T>;
  zpopmax: <T = ScoredMember | null>(key: string, cb?: Callback<T>) => Promise<T>;
  zrandmember: <T = string | null>(key: string, cb?: Callback<T>) => Promise<T>;
  zdiff: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  zinter: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  zunion: <T = string[]>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  zintercard: <T = number>(
    keys: string | string[],
    options?: { LIMIT?: number } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  zremrangebyrank: <T = number>(key: string, start: number, stop: number, cb?: Callback<T>) => Promise<T>;
  zremrangebyscore: <T = number>(
    key: string,
    min: number | string,
    max: number | string,
    cb?: Callback<T>,
  ) => Promise<T>;
  zremrangebylex: <T = number>(key: string, min: string, max: string, cb?: Callback<T>) => Promise<T>;
  zscan: <T = ScanReply>(
    key: string,
    cursor: string | number,
    options?: ScanOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;

  // Bitmap / HyperLogLog
  setbit: <T = number>(key: string, offset: number, value: 0 | 1, cb?: Callback<T>) => Promise<T>;
  getbit: <T = number>(key: string, offset: number, cb?: Callback<T>) => Promise<T>;
  bitcount: <T = number>(
    key: string,
    options?: { start?: number; end?: number; mode?: 'BYTE' | 'BIT' } | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  bitpos: <T = number>(
    key: string,
    bit: 0 | 1,
    options?: Record<string, any> | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  bitop: <T = number>(
    operation: 'AND' | 'OR' | 'XOR' | 'NOT',
    destination: string,
    keys: string | string[],
    cb?: Callback<T>,
  ) => Promise<T>;
  pfadd: <T = boolean>(key: string, elements: string | string[], cb?: Callback<T>) => Promise<T>;
  pfcount: <T = number>(keys: string | string[], cb?: Callback<T>) => Promise<T>;
  pfmerge: <T = string>(destination: string, sources: string | string[], cb?: Callback<T>) => Promise<T>;

  // Streams
  xadd: <T = string>(key: string, id: string, message: Record<string, string>, cb?: Callback<T>) => Promise<T>;
  xlen: <T = number>(key: string, cb?: Callback<T>) => Promise<T>;
  xrange: <T = any[]>(key: string, start: string, end: string, cb?: Callback<T>) => Promise<T>;
  xrevrange: <T = any[]>(key: string, end: string, start: string, cb?: Callback<T>) => Promise<T>;
  xdel: <T = number>(key: string, ids: string | string[], cb?: Callback<T>) => Promise<T>;
  xtrim: <T = number>(
    key: string,
    strategy: 'MAXLEN' | 'MINID',
    threshold: number | string,
    cb?: Callback<T>,
  ) => Promise<T>;
  xack: <T = number>(key: string, group: string, ids: string | string[], cb?: Callback<T>) => Promise<T>;

  // Scripting
  eval: <T = any>(script: string, options?: { keys?: string[]; arguments?: string[] }, cb?: Callback<T>) => Promise<T>;
  evalsha: <T = any>(sha: string, options?: { keys?: string[]; arguments?: string[] }, cb?: Callback<T>) => Promise<T>;
  scriptLoad: <T = string>(script: string, cb?: Callback<T>) => Promise<T>;
  fcall: <T = any>(fn: string, options?: { keys?: string[]; arguments?: string[] }, cb?: Callback<T>) => Promise<T>;
  fcallRo: <T = any>(fn: string, options?: { keys?: string[]; arguments?: string[] }, cb?: Callback<T>) => Promise<T>;

  // Pub/Sub - messages are delivered as the `redisfx:message` server event
  // (channel: string, message: string, mode: 'channel' | 'pattern' | 'sharded').
  publish: <T = number>(channel: string, message: string, cb?: Callback<T>) => Promise<T>;
  spublish: <T = number>(channel: string, message: string, cb?: Callback<T>) => Promise<T>;
  subscribe: <T = true>(
    channels: string | string[],
    options?: SubscribeOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;
  unsubscribe: <T = true>(
    channels: string | string[],
    options?: SubscribeOptions | Callback<T>,
    cb?: Callback<T>,
  ) => Promise<T>;

  // Transactions
  multi: <T = any[]>(commands: { command: string; args?: any[] }[], cb?: Callback<T>) => Promise<T>;

  // Server
  ping: <T = string>(cb?: Callback<T>) => Promise<T>;
  time: <T = any>(cb?: Callback<T>) => Promise<T>;
  dbsize: <T = number>(cb?: Callback<T>) => Promise<T>;
  flushdb: <T = string>(cb?: Callback<T>) => Promise<T>;
  flushall: <T = string>(cb?: Callback<T>) => Promise<T>;
  info: <T = string>(section?: string, cb?: Callback<T>) => Promise<T>;
  configGet: <T = Record<string, string>>(parameter: string, cb?: Callback<T>) => Promise<T>;

  // Raw command
  raw: <T = any>(command: string, args?: any[], cb?: Callback<T>) => Promise<T>;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new TypeError(message);
}

/**
 * Normalises the `(options?, cb?)` tail. A caller may pass the callback in the options slot, in
 * which case it is shifted across so the options argument stays a plain value.
 */
const safeArgs = (options?: any, cb?: Function): [any, Function | undefined] => {
  if (typeof options === 'function') {
    if (cb === undefined) cb = options;
    options = undefined;
  }

  if (cb !== undefined) assert(typeof cb === 'function', `Callback expected function, received ${typeof cb}`);

  return [options, cb];
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
      true,
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
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('set', key, value, options);
    return cb ? cb(result) : result;
  },
  async getdel(key, cb) {
    const result = await execute('getdel', key);
    return cb ? cb(result) : result;
  },
  async getex(key, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('getex', key, options);
    return cb ? cb(result) : result;
  },
  async getrange(key, start, end, cb) {
    const result = await execute('getrange', key, start, end);
    return cb ? cb(result) : result;
  },
  async setrange(key, offset, value, cb) {
    const result = await execute('setrange', key, offset, value);
    return cb ? cb(result) : result;
  },
  async append(key, value, cb) {
    const result = await execute('append', key, value);
    return cb ? cb(result) : result;
  },
  async strlen(key, cb) {
    const result = await execute('strlen', key);
    return cb ? cb(result) : result;
  },
  async setnx(key, value, cb) {
    const result = await execute('setnx', key, value);
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
  async incrbyfloat(key, increment, cb) {
    const result = await execute('incrbyfloat', key, increment);
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
  async msetnx(keyValues, cb) {
    const result = await execute('msetnx', keyValues);
    return cb ? cb(result) : result;
  },

  // Key commands
  async del(keys, cb) {
    const result = await execute('del', keys);
    return cb ? cb(result) : result;
  },
  async unlink(keys, cb) {
    const result = await execute('unlink', keys);
    return cb ? cb(result) : result;
  },
  async exists(keys, cb) {
    const result = await execute('exists', keys);
    return cb ? cb(result) : result;
  },
  async touch(keys, cb) {
    const result = await execute('touch', keys);
    return cb ? cb(result) : result;
  },
  async expire(key, seconds, cb) {
    const result = await execute('expire', key, seconds);
    return cb ? cb(result) : result;
  },
  async pexpire(key, milliseconds, cb) {
    const result = await execute('pexpire', key, milliseconds);
    return cb ? cb(result) : result;
  },
  async expireat(key, timestamp, cb) {
    const result = await execute('expireat', key, timestamp);
    return cb ? cb(result) : result;
  },
  async pexpireat(key, timestamp, cb) {
    const result = await execute('pexpireat', key, timestamp);
    return cb ? cb(result) : result;
  },
  async expiretime(key, cb) {
    const result = await execute('expiretime', key);
    return cb ? cb(result) : result;
  },
  async pexpiretime(key, cb) {
    const result = await execute('pexpiretime', key);
    return cb ? cb(result) : result;
  },
  async ttl(key, cb) {
    const result = await execute('ttl', key);
    return cb ? cb(result) : result;
  },
  async pttl(key, cb) {
    const result = await execute('pttl', key);
    return cb ? cb(result) : result;
  },
  async persist(key, cb) {
    const result = await execute('persist', key);
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
  async renamenx(key, newKey, cb) {
    const result = await execute('renamenx', key, newKey);
    return cb ? cb(result) : result;
  },
  async randomkey(cb) {
    const result = await execute('randomkey');
    return cb ? cb(result) : result;
  },
  async keys(pattern, cb) {
    const result = await execute('keys', pattern);
    return cb ? cb(result) : result;
  },
  async copy(source, destination, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('copy', source, destination, options);
    return cb ? cb(result) : result;
  },
  async scan(cursor, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('scan', cursor, options);
    return cb ? cb(result) : result;
  },
  async objectEncoding(key, cb) {
    const result = await execute('objectEncoding', key);
    return cb ? cb(result) : result;
  },
  async memoryUsage(key, cb) {
    const result = await execute('memoryUsage', key);
    return cb ? cb(result) : result;
  },
  async dump(key, cb) {
    const result = await execute('dump', key);
    return cb ? cb(result) : result;
  },
  async restore(key, ttl, serialized, cb) {
    const result = await execute('restore', key, ttl, serialized);
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
  async hsetnx(key, field, value, cb) {
    const result = await execute('hsetnx', key, field, value);
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
  async hmget(key, fields, cb) {
    const result = await execute('hmget', key, fields);
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
  async hincrbyfloat(key, field, increment, cb) {
    const result = await execute('hincrbyfloat', key, field, increment);
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
  async hstrlen(key, field, cb) {
    const result = await execute('hstrlen', key, field);
    return cb ? cb(result) : result;
  },
  async hrandfield(key, cb) {
    const result = await execute('hrandfield', key);
    return cb ? cb(result) : result;
  },
  async hscan(key, cursor, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('hscan', key, cursor, options);
    return cb ? cb(result) : result;
  },
  async hexpire(key, fields, seconds, cb) {
    const result = await execute('hexpire', key, fields, seconds);
    return cb ? cb(result) : result;
  },
  async hpexpire(key, fields, milliseconds, cb) {
    const result = await execute('hpexpire', key, fields, milliseconds);
    return cb ? cb(result) : result;
  },
  async hexpireat(key, fields, timestamp, cb) {
    const result = await execute('hexpireat', key, fields, timestamp);
    return cb ? cb(result) : result;
  },
  async hpexpireat(key, fields, timestamp, cb) {
    const result = await execute('hpexpireat', key, fields, timestamp);
    return cb ? cb(result) : result;
  },
  async httl(key, fields, cb) {
    const result = await execute('httl', key, fields);
    return cb ? cb(result) : result;
  },
  async hpttl(key, fields, cb) {
    const result = await execute('hpttl', key, fields);
    return cb ? cb(result) : result;
  },
  async hpersist(key, fields, cb) {
    const result = await execute('hpersist', key, fields);
    return cb ? cb(result) : result;
  },
  async hgetex(key, fields, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('hgetex', key, fields, options);
    return cb ? cb(result) : result;
  },
  async hgetdel(key, fields, cb) {
    const result = await execute('hgetdel', key, fields);
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
  async lpushx(key, values, cb) {
    const result = await execute('lpushx', key, values);
    return cb ? cb(result) : result;
  },
  async rpushx(key, values, cb) {
    const result = await execute('rpushx', key, values);
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
  async ltrim(key, start, stop, cb) {
    const result = await execute('ltrim', key, start, stop);
    return cb ? cb(result) : result;
  },
  async lpos(key, element, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('lpos', key, element, options);
    return cb ? cb(result) : result;
  },
  async linsert(key, position, pivot, element, cb) {
    const result = await execute('linsert', key, position, pivot, element);
    return cb ? cb(result) : result;
  },
  async lmove(source, destination, from, to, cb) {
    const result = await execute('lmove', source, destination, from, to);
    return cb ? cb(result) : result;
  },
  async rpoplpush(source, destination, cb) {
    const result = await execute('rpoplpush', source, destination);
    return cb ? cb(result) : result;
  },
  async lmpop(keys, side, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('lmpop', keys, side, options);
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
  async smismember(key, members, cb) {
    const result = await execute('smismember', key, members);
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
  async smove(source, destination, member, cb) {
    const result = await execute('smove', source, destination, member);
    return cb ? cb(result) : result;
  },
  async srandmember(key, count, cb) {
    [count, cb] = safeArgs(count, cb) as any;
    const result = await execute('srandmember', key, count);
    return cb ? cb(result) : result;
  },
  async sinter(keys, cb) {
    const result = await execute('sinter', keys);
    return cb ? cb(result) : result;
  },
  async sunion(keys, cb) {
    const result = await execute('sunion', keys);
    return cb ? cb(result) : result;
  },
  async sdiff(keys, cb) {
    const result = await execute('sdiff', keys);
    return cb ? cb(result) : result;
  },
  async sintercard(keys, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('sintercard', keys, options);
    return cb ? cb(result) : result;
  },
  async sinterstore(destination, keys, cb) {
    const result = await execute('sinterstore', destination, keys);
    return cb ? cb(result) : result;
  },
  async sunionstore(destination, keys, cb) {
    const result = await execute('sunionstore', destination, keys);
    return cb ? cb(result) : result;
  },
  async sdiffstore(destination, keys, cb) {
    const result = await execute('sdiffstore', destination, keys);
    return cb ? cb(result) : result;
  },
  async sscan(key, cursor, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('sscan', key, cursor, options);
    return cb ? cb(result) : result;
  },

  // Sorted set commands
  async zadd(key, score, member, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
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
  async zrangebyscore(key, min, max, cb) {
    const result = await execute('zrangebyscore', key, min, max);
    return cb ? cb(result) : result;
  },
  async zrangestore(destination, source, min, max, cb) {
    const result = await execute('zrangestore', destination, source, min, max);
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
  async zmscore(key, members, cb) {
    const result = await execute('zmscore', key, members);
    return cb ? cb(result) : result;
  },
  async zrank(key, member, cb) {
    const result = await execute('zrank', key, member);
    return cb ? cb(result) : result;
  },
  async zrevrank(key, member, cb) {
    const result = await execute('zrevrank', key, member);
    return cb ? cb(result) : result;
  },
  async zcard(key, cb) {
    const result = await execute('zcard', key);
    return cb ? cb(result) : result;
  },
  async zcount(key, min, max, cb) {
    const result = await execute('zcount', key, min, max);
    return cb ? cb(result) : result;
  },
  async zlexcount(key, min, max, cb) {
    const result = await execute('zlexcount', key, min, max);
    return cb ? cb(result) : result;
  },
  async zincrby(key, increment, member, cb) {
    const result = await execute('zincrby', key, increment, member);
    return cb ? cb(result) : result;
  },
  async zpopmin(key, cb) {
    const result = await execute('zpopmin', key);
    return cb ? cb(result) : result;
  },
  async zpopmax(key, cb) {
    const result = await execute('zpopmax', key);
    return cb ? cb(result) : result;
  },
  async zrandmember(key, cb) {
    const result = await execute('zrandmember', key);
    return cb ? cb(result) : result;
  },
  async zdiff(keys, cb) {
    const result = await execute('zdiff', keys);
    return cb ? cb(result) : result;
  },
  async zinter(keys, cb) {
    const result = await execute('zinter', keys);
    return cb ? cb(result) : result;
  },
  async zunion(keys, cb) {
    const result = await execute('zunion', keys);
    return cb ? cb(result) : result;
  },
  async zintercard(keys, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('zintercard', keys, options);
    return cb ? cb(result) : result;
  },
  async zremrangebyrank(key, start, stop, cb) {
    const result = await execute('zremrangebyrank', key, start, stop);
    return cb ? cb(result) : result;
  },
  async zremrangebyscore(key, min, max, cb) {
    const result = await execute('zremrangebyscore', key, min, max);
    return cb ? cb(result) : result;
  },
  async zremrangebylex(key, min, max, cb) {
    const result = await execute('zremrangebylex', key, min, max);
    return cb ? cb(result) : result;
  },
  async zscan(key, cursor, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('zscan', key, cursor, options);
    return cb ? cb(result) : result;
  },

  // Bitmap / HyperLogLog
  async setbit(key, offset, value, cb) {
    const result = await execute('setbit', key, offset, value);
    return cb ? cb(result) : result;
  },
  async getbit(key, offset, cb) {
    const result = await execute('getbit', key, offset);
    return cb ? cb(result) : result;
  },
  async bitcount(key, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('bitcount', key, options);
    return cb ? cb(result) : result;
  },
  async bitpos(key, bit, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('bitpos', key, bit, options);
    return cb ? cb(result) : result;
  },
  async bitop(operation, destination, keys, cb) {
    const result = await execute('bitop', operation, destination, keys);
    return cb ? cb(result) : result;
  },
  async pfadd(key, elements, cb) {
    const result = await execute('pfadd', key, elements);
    return cb ? cb(result) : result;
  },
  async pfcount(keys, cb) {
    const result = await execute('pfcount', keys);
    return cb ? cb(result) : result;
  },
  async pfmerge(destination, sources, cb) {
    const result = await execute('pfmerge', destination, sources);
    return cb ? cb(result) : result;
  },

  // Streams
  async xadd(key, id, message, cb) {
    const result = await execute('xadd', key, id, message);
    return cb ? cb(result) : result;
  },
  async xlen(key, cb) {
    const result = await execute('xlen', key);
    return cb ? cb(result) : result;
  },
  async xrange(key, start, end, cb) {
    const result = await execute('xrange', key, start, end);
    return cb ? cb(result) : result;
  },
  async xrevrange(key, end, start, cb) {
    const result = await execute('xrevrange', key, end, start);
    return cb ? cb(result) : result;
  },
  async xdel(key, ids, cb) {
    const result = await execute('xdel', key, ids);
    return cb ? cb(result) : result;
  },
  async xtrim(key, strategy, threshold, cb) {
    const result = await execute('xtrim', key, strategy, threshold);
    return cb ? cb(result) : result;
  },
  async xack(key, group, ids, cb) {
    const result = await execute('xack', key, group, ids);
    return cb ? cb(result) : result;
  },

  // Scripting
  async eval(script, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('eval', script, options);
    return cb ? cb(result) : result;
  },
  async evalsha(sha, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('evalsha', sha, options);
    return cb ? cb(result) : result;
  },
  async scriptLoad(script, cb) {
    const result = await execute('scriptLoad', script);
    return cb ? cb(result) : result;
  },
  async fcall(fn, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('fcall', fn, options);
    return cb ? cb(result) : result;
  },
  async fcallRo(fn, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('fcallRo', fn, options);
    return cb ? cb(result) : result;
  },

  // Pub/Sub
  async publish(channel, message, cb) {
    const result = await execute('publish', channel, message);
    return cb ? cb(result) : result;
  },
  async spublish(channel, message, cb) {
    const result = await execute('spublish', channel, message);
    return cb ? cb(result) : result;
  },
  async subscribe(channels, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('subscribe', channels, options);
    return cb ? cb(result) : result;
  },
  async unsubscribe(channels, options, cb) {
    [options, cb] = safeArgs(options, cb) as any;
    const result = await execute('unsubscribe', channels, options);
    return cb ? cb(result) : result;
  },

  // Transactions
  async multi(commands, cb) {
    const result = await execute('multi', commands);
    return cb ? cb(result) : result;
  },

  // Server
  async ping(cb) {
    const result = await execute('ping');
    return cb ? cb(result) : result;
  },
  async time(cb) {
    const result = await execute('time');
    return cb ? cb(result) : result;
  },
  async dbsize(cb) {
    const result = await execute('dbsize');
    return cb ? cb(result) : result;
  },
  async flushdb(cb) {
    const result = await execute('flushdb');
    return cb ? cb(result) : result;
  },
  async flushall(cb) {
    const result = await execute('flushall');
    return cb ? cb(result) : result;
  },
  async info(section, cb) {
    [section, cb] = safeArgs(section, cb) as any;
    const result = await execute('info', section);
    return cb ? cb(result) : result;
  },
  async configGet(parameter, cb) {
    const result = await execute('configGet', parameter);
    return cb ? cb(result) : result;
  },

  // Raw command
  async raw(command, args, cb) {
    [args, cb] = safeArgs(args, cb) as any;
    const result = await execute('raw', command, args ?? []);
    return cb ? cb(result) : result;
  },
};
