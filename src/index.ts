import type { CFXCallback, ScanOptions, SetOptions, ZAddOptions } from './types';
import { executeCommand, executeMulti, client } from './database';
import { sleep } from 'utils/sleep';
import { setCallback } from 'utils/setCallback';
import { closeSubscriber, subscribe, unsubscribe } from './database/pubsub';
import('./update');

const Redis = {} as Record<string, Function>;

/**
 * Exports are invoked either directly - `exports.redisfx:get(key, cb)` - or through the generated
 * `*_async` wrapper, which appends `(callback, invokingResource, isPromise)` after the caller's
 * arguments. Every handler therefore declares its user-facing parameters explicitly so that
 * `fn.length` reports them, letting the wrapper pad omitted optional arguments instead of
 * shifting the callback into an argument slot.
 */
const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

/** Factories for the common `(args..., cb?, invokingResource?, isPromise?)` shape. */
const cmd0 =
  (command: string) =>
  (cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [], setCallback(cb), isPromise);

const cmd1 =
  (command: string) =>
  (a: any, cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [a], setCallback(cb), isPromise);

const cmd2 =
  (command: string) =>
  (a: any, b: any, cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [a, b], setCallback(cb), isPromise);

const cmd3 =
  (command: string) =>
  (a: any, b: any, c: any, cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [a, b, c], setCallback(cb), isPromise);

const cmd4 =
  (command: string) =>
  (a: any, b: any, c: any, d: any, cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [a, b, c, d], setCallback(cb), isPromise);

/** `(key, member | member[])` commands - Redis takes a variadic list, so a scalar is wrapped. */
const cmdKeyList =
  (command: string) =>
  (key: string, members: any, cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [key, toArray(members)], setCallback(cb), isPromise);

/** `(key | key[])` commands. */
const cmdList =
  (command: string) =>
  (keys: string | string[], cb?: CFXCallback, invokingResource = GetInvokingResource(), isPromise?: boolean) =>
    executeCommand(invokingResource, command, [toArray(keys)], setCallback(cb), isPromise);

/** `(args..., options?)` commands - the options object is only forwarded when it really is one. */
const cmd1Opt =
  (command: string) =>
  (
    a: any,
    options?: Record<string, any> | CFXCallback,
    cb?: CFXCallback,
    invokingResource = GetInvokingResource(),
    isPromise?: boolean,
  ) => {
    const args: any[] = [a];
    if (options && typeof options === 'object') args.push(options);
    return executeCommand(invokingResource, command, args, setCallback(options, cb), isPromise);
  };

const cmd2Opt =
  (command: string) =>
  (
    a: any,
    b: any,
    options?: Record<string, any> | CFXCallback,
    cb?: CFXCallback,
    invokingResource = GetInvokingResource(),
    isPromise?: boolean,
  ) => {
    const args: any[] = [a, b];
    if (options && typeof options === 'object') args.push(options);
    return executeCommand(invokingResource, command, args, setCallback(options, cb), isPromise);
  };

// ============================================
// Connection utilities
// ============================================

Redis.isReady = () => !!client;

Redis.awaitConnection = async () => {
  while (!client) await sleep(0);
  return true;
};

// ============================================
// String Commands
// ============================================

Redis.get = cmd1('GET');
Redis.getdel = cmd1('GETDEL');
Redis.getex = cmd1Opt('GETEX');
Redis.getrange = cmd3('GETRANGE');
Redis.setrange = cmd3('SETRANGE');
Redis.append = cmd2('APPEND');
Redis.strlen = cmd1('STRLEN');
Redis.setnx = cmd2('SETNX');
Redis.incrbyfloat = cmd2('INCRBYFLOAT');
Redis.mget = cmd1('MGET');
Redis.mset = cmd1('MSET');
Redis.msetnx = cmd1('MSETNX');
Redis.incr = cmd1('INCR');
Redis.incrby = cmd2('INCRBY');
Redis.decr = cmd1('DECR');
Redis.decrby = cmd2('DECRBY');

Redis.set = (
  key: string,
  value: string | number,
  options?: SetOptions | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) => {
  const args: any[] = [key, value];
  if (options && typeof options === 'object') args.push(options);
  return executeCommand(invokingResource, 'SET', args, setCallback(options, cb), isPromise);
};

// ============================================
// Key Commands
// ============================================

Redis.del = cmdList('DEL');
Redis.unlink = cmdList('UNLINK');
Redis.exists = cmdList('EXISTS');
Redis.touch = cmdList('TOUCH');
Redis.expire = cmd2('EXPIRE');
Redis.pexpire = cmd2('PEXPIRE');
Redis.expireat = cmd2('EXPIREAT');
Redis.pexpireat = cmd2('PEXPIREAT');
Redis.expiretime = cmd1('EXPIRETIME');
Redis.pexpiretime = cmd1('PEXPIRETIME');
Redis.ttl = cmd1('TTL');
Redis.pttl = cmd1('PTTL');
Redis.persist = cmd1('PERSIST');
Redis.type = cmd1('TYPE');
Redis.rename = cmd2('RENAME');
Redis.renamenx = cmd2('RENAMENX');
Redis.randomkey = cmd0('RANDOMKEY');
Redis.keys = cmd1('KEYS');
Redis.copy = cmd2Opt('COPY');
Redis.objectEncoding = cmd1('OBJECTENCODING');
Redis.memoryUsage = cmd1('MEMORYUSAGE');
Redis.dump = cmd1('DUMP');
Redis.restore = cmd3('RESTORE');

Redis.scan = (
  cursor: string | number,
  options?: ScanOptions | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) => {
  // node-redis rejects a numeric cursor - every protocol argument is a bulk string.
  const args: any[] = [String(cursor)];
  if (options && typeof options === 'object') args.push(options);
  return executeCommand(invokingResource, 'SCAN', args, setCallback(options, cb), isPromise);
};

// ============================================
// Hash Commands
// ============================================

Redis.hget = cmd2('HGET');
Redis.hset = cmd3('HSET');
Redis.hsetnx = cmd3('HSETNX');
Redis.hgetall = cmd1('HGETALL');
Redis.hincrby = cmd3('HINCRBY');
Redis.hincrbyfloat = cmd3('HINCRBYFLOAT');
Redis.hexists = cmd2('HEXISTS');
Redis.hkeys = cmd1('HKEYS');
Redis.hvals = cmd1('HVALS');
Redis.hlen = cmd1('HLEN');
Redis.hstrlen = cmd2('HSTRLEN');
Redis.hrandfield = cmd1('HRANDFIELD');
Redis.hdel = cmdKeyList('HDEL');
Redis.hmget = cmdKeyList('HMGET');
Redis.hscan = cmd2Opt('HSCAN');

// HMSET is deprecated on the server; HSET accepts the same field/value map.
Redis.hmset = cmd2('HSET');

// Hash field expiration (Redis 7.4+)
Redis.hexpire = cmd3('HEXPIRE');
Redis.hpexpire = cmd3('HPEXPIRE');
Redis.hexpireat = cmd3('HEXPIREAT');
Redis.hpexpireat = cmd3('HPEXPIREAT');
Redis.httl = cmd2('HTTL');
Redis.hpttl = cmd2('HPTTL');
Redis.hpersist = cmd2('HPERSIST');
// HGETEX / HGETDEL (Redis 8.0+)
Redis.hgetex = cmd2Opt('HGETEX');
Redis.hgetdel = cmd2('HGETDEL');

// ============================================
// List Commands
// ============================================

Redis.lpush = cmdKeyList('LPUSH');
Redis.rpush = cmdKeyList('RPUSH');
Redis.lpushx = cmdKeyList('LPUSHX');
Redis.rpushx = cmdKeyList('RPUSHX');
Redis.lpop = cmd1('LPOP');
Redis.rpop = cmd1('RPOP');
Redis.lrange = cmd3('LRANGE');
Redis.llen = cmd1('LLEN');
Redis.lindex = cmd2('LINDEX');
Redis.lset = cmd3('LSET');
Redis.lrem = cmd3('LREM');
Redis.ltrim = cmd3('LTRIM');
Redis.lpos = cmd2Opt('LPOS');
Redis.linsert = cmd4('LINSERT');
Redis.lmove = cmd4('LMOVE');
Redis.rpoplpush = cmd2('RPOPLPUSH');
Redis.lmpop = cmd2Opt('LMPOP');

// ============================================
// Set Commands
// ============================================

Redis.sadd = cmdKeyList('SADD');
Redis.srem = cmdKeyList('SREM');
Redis.smembers = cmd1('SMEMBERS');
Redis.sismember = cmd2('SISMEMBER');
Redis.smismember = cmdKeyList('SMISMEMBER');
Redis.scard = cmd1('SCARD');
Redis.spop = cmd1('SPOP');
Redis.smove = cmd3('SMOVE');
Redis.sinter = cmdList('SINTER');
Redis.sunion = cmdList('SUNION');
Redis.sdiff = cmdList('SDIFF');
Redis.sintercard = cmd1Opt('SINTERCARD');
Redis.sinterstore = cmd2('SINTERSTORE');
Redis.sunionstore = cmd2('SUNIONSTORE');
Redis.sdiffstore = cmd2('SDIFFSTORE');
Redis.sscan = cmd2Opt('SSCAN');

Redis.srandmember = (
  key: string,
  count?: number | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) => {
  const callback = setCallback(count, cb);
  return typeof count === 'number'
    ? executeCommand(invokingResource, 'SRANDMEMBERCOUNT', [key, count], callback, isPromise)
    : executeCommand(invokingResource, 'SRANDMEMBER', [key], callback, isPromise);
};

// ============================================
// Sorted Set Commands
// ============================================

Redis.zrange = cmd3('ZRANGE');
Redis.zrangeWithScores = cmd3('ZRANGEWITHSCORES');
Redis.zrangebyscore = cmd3('ZRANGEBYSCORE');
Redis.zrangestore = cmd4('ZRANGESTORE');
Redis.zrem = cmdKeyList('ZREM');
Redis.zscore = cmd2('ZSCORE');
Redis.zmscore = cmdKeyList('ZMSCORE');
Redis.zrank = cmd2('ZRANK');
Redis.zrevrank = cmd2('ZREVRANK');
Redis.zcard = cmd1('ZCARD');
Redis.zcount = cmd3('ZCOUNT');
Redis.zlexcount = cmd3('ZLEXCOUNT');
Redis.zincrby = cmd3('ZINCRBY');
Redis.zpopmin = cmd1('ZPOPMIN');
Redis.zpopmax = cmd1('ZPOPMAX');
Redis.zrandmember = cmd1('ZRANDMEMBER');
Redis.zdiff = cmdList('ZDIFF');
Redis.zinter = cmdList('ZINTER');
Redis.zunion = cmdList('ZUNION');
Redis.zintercard = cmd1Opt('ZINTERCARD');
Redis.zremrangebyrank = cmd3('ZREMRANGEBYRANK');
Redis.zremrangebyscore = cmd3('ZREMRANGEBYSCORE');
Redis.zremrangebylex = cmd3('ZREMRANGEBYLEX');
Redis.zscan = cmd2Opt('ZSCAN');

Redis.zadd = (
  key: string,
  score: number,
  member: string,
  options?: ZAddOptions | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) => {
  const args: any[] = [key, { score, value: String(member) }];
  if (options && typeof options === 'object') args.push(options);
  return executeCommand(invokingResource, 'ZADD', args, setCallback(options, cb), isPromise);
};

// ============================================
// Bitmap / HyperLogLog Commands
// ============================================

Redis.setbit = cmd3('SETBIT');
Redis.getbit = cmd2('GETBIT');
Redis.bitcount = cmd1Opt('BITCOUNT');
Redis.bitpos = cmd2Opt('BITPOS');
Redis.bitop = cmd3('BITOP');
Redis.pfadd = cmdKeyList('PFADD');
Redis.pfcount = cmdList('PFCOUNT');
Redis.pfmerge = cmd2('PFMERGE');

// ============================================
// Stream Commands
// ============================================

Redis.xadd = cmd3('XADD');
Redis.xlen = cmd1('XLEN');
Redis.xrange = cmd3('XRANGE');
Redis.xrevrange = cmd3('XREVRANGE');
Redis.xdel = cmdKeyList('XDEL');
Redis.xtrim = cmd3('XTRIM');
Redis.xack = cmd3('XACK');

// ============================================
// Scripting
// ============================================

Redis.eval = cmd2('EVAL');
Redis.evalsha = cmd2('EVALSHA');
Redis.scriptLoad = cmd1('SCRIPTLOAD');
Redis.fcall = cmd2('FCALL');
Redis.fcallRo = cmd2('FCALL_RO');

// ============================================
// Pub/Sub
// ============================================

Redis.publish = cmd2('PUBLISH');
Redis.spublish = cmd2('SPUBLISH');

Redis.subscribe = (
  channels: string | string[],
  options?: { pattern?: boolean; sharded?: boolean } | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) =>
  subscribe(
    invokingResource,
    toArray(channels),
    options && typeof options === 'object' ? options : {},
    setCallback(options, cb),
    isPromise,
  );

Redis.unsubscribe = (
  channels: string | string[],
  options?: { pattern?: boolean; sharded?: boolean } | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) =>
  unsubscribe(
    invokingResource,
    toArray(channels),
    options && typeof options === 'object' ? options : {},
    setCallback(options, cb),
    isPromise,
  );

// ============================================
// Transactions
// ============================================

Redis.multi = (
  commands: { command: string; args?: unknown[] }[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) => executeMulti(invokingResource, commands, setCallback(cb), isPromise);

// ============================================
// Server Commands
// ============================================

Redis.ping = cmd0('PING');
Redis.time = cmd0('TIME');
Redis.dbsize = cmd0('DBSIZE');
Redis.flushdb = cmd0('FLUSHDB');
Redis.flushall = cmd0('FLUSHALL');
Redis.info = cmd1('INFO');
Redis.configGet = cmd1('CONFIGGET');

// ============================================
// Raw Command Execution
// ============================================

Redis.raw = (
  command: string,
  args: unknown[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean,
) =>
  executeCommand(
    invokingResource,
    String(command).toUpperCase(),
    args === undefined || args === null ? [] : toArray(args),
    setCallback(cb),
    isPromise,
    true,
  );

// ============================================
// Export all methods as CFX exports
// ============================================

/**
 * Handlers that resolve synchronously (or manage their own promise) and must not go through the
 * callback-appending async wrapper, whose promise would never settle for them.
 */
const SYNCHRONOUS_EXPORTS = new Set(['isReady', 'awaitConnection']);

for (const key in Redis) {
  const exp = Redis[key];

  if (SYNCHRONOUS_EXPORTS.has(key)) {
    global.exports(key, exp);
    global.exports(`${key}_async`, exp);
    global.exports(`${key}Sync`, exp);
    continue;
  }

  // `fn.length` counts parameters up to the first defaulted one, i.e. the user-facing arguments
  // plus the trailing `cb`. Padding to that width keeps `invokingResource`/`isPromise` aligned
  // when the caller omits an optional argument.
  const userArity = Math.max(exp.length - 1, 0);

  const async_exp = (...args: any[]) => {
    const invokingResource = GetInvokingResource();

    return new Promise((resolve, reject) => {
      const fullArgs = args.slice(0, userArity);
      while (fullArgs.length < userArity) fullArgs.push(undefined);

      fullArgs.push(
        (result: unknown, err?: string) => {
          if (err) return reject(new Error(err));
          resolve(result);
        },
        invokingResource,
        true,
      );

      exp(...fullArgs);
    });
  };

  global.exports(key, exp);
  // async_retval
  global.exports(`${key}_async`, async_exp);
  // deprecated aliases for async_retval
  global.exports(`${key}Sync`, async_exp);
}

on('onResourceStop', (resource: string) => {
  if (resource === GetCurrentResourceName()) closeSubscriber();
});
