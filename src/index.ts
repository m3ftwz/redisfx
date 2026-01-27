import type { CFXCallback, SetOptions, ZAddOptions } from './types';
import { executeCommand, executeMulti, client } from './database';
import { sleep } from 'utils/sleep';
import { setCallback } from 'utils/setCallback';
import('./update');

const Redis = {} as Record<string, Function>;

// Connection utilities
Redis.isReady = () => {
  return client ? true : false;
};

Redis.awaitConnection = async () => {
  while (!client) await sleep(0);
  return true;
};

// ============================================
// String Commands
// ============================================

Redis.get = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'GET', [key], callback, isPromise);
};

Redis.set = (
  key: string,
  value: string | number,
  options?: SetOptions | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(options, cb);
  const args: any[] = [key, value];

  if (options && typeof options === 'object') {
    args.push(options);
  }

  return executeCommand(invokingResource, 'SET', args, callback, isPromise);
};

Redis.del = (
  keys: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const keyArray = Array.isArray(keys) ? keys : [keys];
  return executeCommand(invokingResource, 'DEL', [keyArray], callback, isPromise);
};

Redis.exists = (
  keys: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const keyArray = Array.isArray(keys) ? keys : [keys];
  return executeCommand(invokingResource, 'EXISTS', [keyArray], callback, isPromise);
};

Redis.expire = (
  key: string,
  seconds: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'EXPIRE', [key, seconds], callback, isPromise);
};

Redis.ttl = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'TTL', [key], callback, isPromise);
};

Redis.incr = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'INCR', [key], callback, isPromise);
};

Redis.incrby = (
  key: string,
  increment: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'INCRBY', [key, increment], callback, isPromise);
};

Redis.decr = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'DECR', [key], callback, isPromise);
};

Redis.decrby = (
  key: string,
  decrement: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'DECRBY', [key, decrement], callback, isPromise);
};

Redis.mget = (
  keys: string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'MGET', [keys], callback, isPromise);
};

Redis.mset = (
  keyValues: Record<string, string | number>,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'MSET', [keyValues], callback, isPromise);
};

// ============================================
// Hash Commands
// ============================================

Redis.hget = (
  key: string,
  field: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HGET', [key, field], callback, isPromise);
};

Redis.hset = (
  key: string,
  field: string,
  value: string | number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HSET', [key, field, value], callback, isPromise);
};

Redis.hmset = (
  key: string,
  fieldValues: Record<string, string | number>,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HSET', [key, fieldValues], callback, isPromise);
};

Redis.hgetall = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HGETALL', [key], callback, isPromise);
};

Redis.hdel = (
  key: string,
  fields: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const fieldArray = Array.isArray(fields) ? fields : [fields];
  return executeCommand(invokingResource, 'HDEL', [key, fieldArray], callback, isPromise);
};

Redis.hincrby = (
  key: string,
  field: string,
  increment: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HINCRBY', [key, field, increment], callback, isPromise);
};

Redis.hexists = (
  key: string,
  field: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HEXISTS', [key, field], callback, isPromise);
};

Redis.hkeys = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HKEYS', [key], callback, isPromise);
};

Redis.hvals = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HVALS', [key], callback, isPromise);
};

Redis.hlen = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'HLEN', [key], callback, isPromise);
};

// ============================================
// List Commands
// ============================================

Redis.lpush = (
  key: string,
  values: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const valueArray = Array.isArray(values) ? values : [values];
  return executeCommand(invokingResource, 'LPUSH', [key, valueArray], callback, isPromise);
};

Redis.rpush = (
  key: string,
  values: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const valueArray = Array.isArray(values) ? values : [values];
  return executeCommand(invokingResource, 'RPUSH', [key, valueArray], callback, isPromise);
};

Redis.lpop = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LPOP', [key], callback, isPromise);
};

Redis.rpop = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'RPOP', [key], callback, isPromise);
};

Redis.lrange = (
  key: string,
  start: number,
  stop: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LRANGE', [key, start, stop], callback, isPromise);
};

Redis.llen = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LLEN', [key], callback, isPromise);
};

Redis.lindex = (
  key: string,
  index: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LINDEX', [key, index], callback, isPromise);
};

Redis.lset = (
  key: string,
  index: number,
  value: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LSET', [key, index, value], callback, isPromise);
};

Redis.lrem = (
  key: string,
  count: number,
  value: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'LREM', [key, count, value], callback, isPromise);
};

// ============================================
// Set Commands
// ============================================

Redis.sadd = (
  key: string,
  members: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const memberArray = Array.isArray(members) ? members : [members];
  return executeCommand(invokingResource, 'SADD', [key, memberArray], callback, isPromise);
};

Redis.srem = (
  key: string,
  members: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const memberArray = Array.isArray(members) ? members : [members];
  return executeCommand(invokingResource, 'SREM', [key, memberArray], callback, isPromise);
};

Redis.smembers = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'SMEMBERS', [key], callback, isPromise);
};

Redis.sismember = (
  key: string,
  member: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'SISMEMBER', [key, member], callback, isPromise);
};

Redis.scard = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'SCARD', [key], callback, isPromise);
};

Redis.spop = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'SPOP', [key], callback, isPromise);
};

Redis.srandmember = (
  key: string,
  count?: number | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(count, cb);
  if (typeof count === 'number') {
    return executeCommand(invokingResource, 'SRANDMEMBERCOUNT', [key, count], callback, isPromise);
  }
  return executeCommand(invokingResource, 'SRANDMEMBER', [key], callback, isPromise);
};

// ============================================
// Sorted Set Commands
// ============================================

Redis.zadd = (
  key: string,
  score: number,
  member: string,
  options?: ZAddOptions | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(options, cb);
  const memberObj = { score, value: String(member) };
  const args: any[] = [key, memberObj];

  if (options && typeof options === 'object') {
    args.push(options);
  }

  return executeCommand(invokingResource, 'ZADD', args, callback, isPromise);
};

Redis.zrange = (
  key: string,
  start: number,
  stop: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZRANGE', [key, start, stop], callback, isPromise);
};

Redis.zrangeWithScores = (
  key: string,
  start: number,
  stop: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZRANGEWITHSCORES', [key, start, stop], callback, isPromise);
};

Redis.zrem = (
  key: string,
  members: string | string[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  const memberArray = Array.isArray(members) ? members : [members];
  return executeCommand(invokingResource, 'ZREM', [key, memberArray], callback, isPromise);
};

Redis.zscore = (
  key: string,
  member: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZSCORE', [key, member], callback, isPromise);
};

Redis.zrank = (
  key: string,
  member: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZRANK', [key, member], callback, isPromise);
};

Redis.zcard = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZCARD', [key], callback, isPromise);
};

Redis.zincrby = (
  key: string,
  increment: number,
  member: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'ZINCRBY', [key, increment, member], callback, isPromise);
};

// ============================================
// Transaction Commands
// ============================================

Redis.multi = (
  commands: { command: string; args: any[] }[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeMulti(invokingResource, commands, callback, isPromise);
};

// ============================================
// Key Commands
// ============================================

Redis.keys = (
  pattern: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'KEYS', [pattern], callback, isPromise);
};

Redis.scan = (
  cursor: number,
  options?: { MATCH?: string; COUNT?: number } | CFXCallback,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(options, cb);
  const args: any[] = [String(cursor)];

  if (options && typeof options === 'object') {
    args.push(options);
  }

  return executeCommand(invokingResource, 'SCAN', args, callback, isPromise);
};

Redis.type = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'TYPE', [key], callback, isPromise);
};

Redis.rename = (
  key: string,
  newKey: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'RENAME', [key, newKey], callback, isPromise);
};

Redis.persist = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'PERSIST', [key], callback, isPromise);
};

Redis.pttl = (
  key: string,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'PTTL', [key], callback, isPromise);
};

Redis.expireat = (
  key: string,
  timestamp: number,
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'EXPIREAT', [key, timestamp], callback, isPromise);
};

// ============================================
// Server Commands
// ============================================

Redis.ping = (
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'PING', [], callback, isPromise);
};

Redis.flushdb = (
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'FLUSHDB', [], callback, isPromise);
};

Redis.dbsize = (
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, 'DBSIZE', [], callback, isPromise);
};

// ============================================
// Raw Command Execution
// ============================================

Redis.raw = (
  command: string,
  args: any[],
  cb?: CFXCallback,
  invokingResource = GetInvokingResource(),
  isPromise?: boolean
) => {
  const callback = setCallback(cb);
  return executeCommand(invokingResource, '_RAW:' + command, args, callback, isPromise);
};

// ============================================
// Export all methods as CFX exports
// ============================================

for (const key in Redis) {
  const exp = Redis[key];

  // Async wrapper for promise-based calls
  const async_exp = (...args: any[]) => {
    const invokingResource = GetInvokingResource();
    return new Promise((resolve, reject) => {
      // Add callback and invokingResource to args
      const fullArgs = [...args, (result: unknown, err: string) => {
        if (err) return reject(new Error(err));
        resolve(result);
      }, invokingResource, true];

      Redis[key](...fullArgs);
    });
  };

  global.exports(key, exp);
  // async_retval
  global.exports(`${key}_async`, async_exp);
  // deprecated aliases for async_retval
  global.exports(`${key}Sync`, async_exp);
}
