This project was forked from CommunityOx's oxmysql and adapted to use Redis instead of MySQL.

# redisfx

A FiveM resource providing Redis connectivity for game server scripts using [node-redis](https://github.com/redis/node-redis). It serves as a bridge between your FiveM resources and a Redis database, offering both synchronous and asynchronous APIs.

![](https://img.shields.io/github/downloads/m3ftwz/redisfx/total?logo=github)
![](https://img.shields.io/github/downloads/m3ftwz/redisfx/latest/total?logo=github)
![](https://img.shields.io/github/contributors/m3ftwz/redisfx?logo=github)
![](https://img.shields.io/github/v/release/m3ftwz/redisfx?logo=github)

## Links

- [Download](https://github.com/m3ftwz/redisfx/releases/latest/download/redisfx.zip)
- [npm Package](https://www.npmjs.com/package/@m3ftwz/redisfx)

## Features

- Full Redis command support (strings, hashes, lists, sets, sorted sets)
- Async/await and callback-based APIs
- Real-time command monitoring dashboard
- Slow command detection and logging
- Per-resource metrics tracking
- TypeScript support with full type definitions

## Installation

1. Download the [latest release](https://github.com/m3ftwz/redisfx/releases/latest/download/redisfx.zip)
2. Extract to your `resources` folder
3. Add `start redisfx` to your `server.cfg`
4. Configure your connection string (see below)

## Configuration

Add these convars to your `server.cfg`:

```lua
# Required - Redis connection string
setr redis_connection_string "redis://localhost:6379"

# Optional - Enable debug logging (default: false)
# Can be true, false, or a JSON array of resource names: '["myresource"]'
setr redis_debug false

# Optional - Enable web dashboard (default: false)
setr redis_ui false

# Optional - Slow command warning threshold in ms (default: 200)
setr redis_slow_query_warning 200

# Optional - How long a command may wait to reach the socket before it is rejected.
# This bounds "Redis is unreachable", not slow commands: once a command has been written
# the server may take as long as it needs. Set to 0 to wait forever. (default: 5000)
setr redis_command_timeout 5000

# Optional - RESP protocol version. Set to 2 only for servers that cannot negotiate RESP3.
# Reply shapes are identical either way. (default: 3)
setr redis_resp 3

# Optional - Disable the startup version check (default: true)
setr redis_versioncheck true
```

### Connection String Formats

**URL format (recommended):**
```
redis://localhost:6379
redis://localhost:6379/0
redis://username:password@localhost:6379/0
rediss://localhost:6379  # TLS connection
```

Credentials are percent-decoded, so a password containing `@`, `:` or `/` must be percent-encoded
in the URL (e.g. `p@ss` becomes `p%40ss`).

**Key-value format:**
```
host=localhost;port=6379;password=secret;database=0;tls=true
```

## Requirements

- Redis 6.2 or newer. Commands are dispatched as-is, so anything your server does not implement
  fails with a normal Redis error — hash-field expiry (`hexpire`, `httl`, `hpersist`) needs 7.4+,
  and `hgetex` / `hgetdel` need 8.0+.
- FXServer with `node_version '22'` (node-redis v6 requires Node 20+).

## Usage

> **Note:** All commands automatically wait for Redis to connect before executing. You don't need to explicitly wait for the connection - just call commands directly and they will queue until ready.
>
> If you need to run initialization logic only after Redis is connected, you can use `Redis.ready.await()` (Lua) or `await redisfx.awaitConnection()` (JS/TS).

### Lua

Add the following to your `fxmanifest.lua`:

```lua
server_script '@redisfx/lib/Redis.lua'
```

Then use in your scripts:

```lua
-- String commands
local name = Redis.get.await('player:1:name')
Redis.set('player:1:name', 'John', { EX = 3600 })  -- expires in 1 hour

-- Hash commands
Redis.hset('player:1', 'money', 1000)
local money = Redis.hget.await('player:1', 'money')
local player = Redis.hgetall.await('player:1')

-- List commands
Redis.lpush('queue', 'job1')
local job = Redis.lpop.await('queue')

-- Set commands
Redis.sadd('online', 'player:1')
local isOnline = Redis.sismember.await('online', 'player:1')

-- Sorted sets (leaderboards)
Redis.zadd('leaderboard', 100, 'player:1')
local top10 = Redis.zrange.await('leaderboard', 0, 9)
```

**Using exports directly:**

```lua
local Redis = exports['redisfx']

local name = Redis:get('player:1:name')
Redis:set('player:1:name', 'John')
```

**Async vs Sync:**

```lua
-- Async (non-blocking, uses callbacks)
Redis.get('key', function(result)
    print(result)
end)

-- Sync (blocking, returns value directly)
local result = Redis.get.await('key')

-- Aliases available
Redis.Async.get('key', callback)
Redis.Sync.get('key')
```

### JavaScript / TypeScript

Install the npm package for intellisense and type support:

```bash
npm install @m3ftwz/redisfx
# or
pnpm add @m3ftwz/redisfx
```

Usage:

```typescript
import { redisfx } from '@m3ftwz/redisfx';

// String commands
const name = await redisfx.get('player:1:name');
await redisfx.set('player:1:name', 'John', { EX: 3600 });

// Hash commands
await redisfx.hset('player:1', 'money', 1000);
const money = await redisfx.hget('player:1', 'money');

// All commands support both promises and callbacks
redisfx.get('key', (result) => {
    console.log(result);
});
```

### Pub/Sub

Subscribed messages are delivered as the `redisfx:message` server event, so any resource can
consume them without holding a callback across the export boundary.

```lua
Redis.subscribe('chat:global')
Redis.subscribe({ 'events:*' }, { pattern = true })

AddEventHandler('redisfx:message', function(channel, message, mode)
    print(('[%s] %s -> %s'):format(mode, channel, message))
end)

Redis.publish('chat:global', json.encode({ from = 'server', text = 'hello' }))
```

Subscriptions are reference-counted per resource: a channel is only left once every resource that
subscribed to it has unsubscribed or stopped.

## Commands Reference

### Strings
`get`, `set`, `getdel`, `getex`, `getrange`, `setrange`, `append`, `strlen`, `setnx`, `incr`,
`incrby`, `incrbyfloat`, `decr`, `decrby`, `mget`, `mset`, `msetnx`

### Keys
`del`, `unlink`, `exists`, `touch`, `expire`, `pexpire`, `expireat`, `pexpireat`, `expiretime`,
`pexpiretime`, `ttl`, `pttl`, `persist`, `type`, `rename`, `renamenx`, `randomkey`, `keys`, `scan`,
`copy`, `objectEncoding`, `memoryUsage`, `dump`, `restore`

### Hashes
`hget`, `hset`, `hsetnx`, `hmset`, `hgetall`, `hmget`, `hdel`, `hincrby`, `hincrbyfloat`,
`hexists`, `hkeys`, `hvals`, `hlen`, `hstrlen`, `hrandfield`, `hscan`

Hash-field expiry (Redis 7.4+): `hexpire`, `hpexpire`, `hexpireat`, `hpexpireat`, `httl`, `hpttl`,
`hpersist`. Redis 8.0+: `hgetex`, `hgetdel`.

### Lists
`lpush`, `rpush`, `lpushx`, `rpushx`, `lpop`, `rpop`, `lrange`, `llen`, `lindex`, `lset`, `lrem`,
`ltrim`, `lpos`, `linsert`, `lmove`, `rpoplpush`, `lmpop`

### Sets
`sadd`, `srem`, `smembers`, `sismember`, `smismember`, `scard`, `spop`, `smove`, `srandmember`,
`sinter`, `sunion`, `sdiff`, `sintercard`, `sinterstore`, `sunionstore`, `sdiffstore`, `sscan`

### Sorted Sets
`zadd`, `zrange`, `zrangeWithScores`, `zrangebyscore`, `zrangestore`, `zrem`, `zscore`, `zmscore`,
`zrank`, `zrevrank`, `zcard`, `zcount`, `zlexcount`, `zincrby`, `zpopmin`, `zpopmax`,
`zrandmember`, `zdiff`, `zinter`, `zunion`, `zintercard`, `zremrangebyrank`, `zremrangebyscore`,
`zremrangebylex`, `zscan`

### Bitmaps & HyperLogLog
`setbit`, `getbit`, `bitcount`, `bitpos`, `bitop`, `pfadd`, `pfcount`, `pfmerge`

### Streams
`xadd`, `xlen`, `xrange`, `xrevrange`, `xdel`, `xtrim`, `xack`

### Scripting
`eval`, `evalsha`, `scriptLoad`, `fcall`, `fcallRo`

### Pub/Sub
`publish`, `spublish`, `subscribe`, `unsubscribe`

### Server
`ping`, `time`, `dbsize`, `flushdb`, `flushall`, `info`, `configGet`

### Other
`multi` (MULTI/EXEC), `raw` (execute any Redis command)

```lua
-- MULTI/EXEC
local results = Redis.multi.await({
    { command = 'SET', args = { 'a', '1' } },
    { command = 'INCR', args = { 'a' } },
})

-- Anything not covered by a named export
Redis.raw.await('GEOADD', { 'places', '13.361389', '38.115556', 'Palermo' })
```

> **Note:** `raw` sends the command verbatim over the protocol. Arrays are flattened into variadic
> arguments and objects are JSON-encoded; `nil`/`null` arguments are rejected rather than sent as
> an empty string.

## Return values

Replies come from node-redis, not raw protocol strings. In particular scores are numbers, not
strings:

| Command | Returns |
| --- | --- |
| `zscore`, `zincrby`, `zmscore` | `number` (or `null`) |
| `zrangeWithScores`, `zpopmin`, `zpopmax` | `{ value, score }` |
| `hgetall`, `configGet` | plain object |
| `scan`, `hscan`, `sscan`, `zscan` | `{ cursor, keys }` |
| `exists`, `del`, `ttl` | `number` |

## Web Dashboard

Enable the dashboard to monitor Redis commands in real-time:

```lua
setr redis_ui true
```

Use the `/redis` command in-game (requires ACE permission `command.redis`) to open the dashboard. It displays:

- Total commands executed per resource
- Execution times
- Slow command highlighting
- Command history with search

## Logging

### Debug Logging

Enable debug mode to log all commands:

```lua
setr redis_debug true
```

Or filter to specific resources:

```lua
setr redis_debug '["myresource", "anotherresource"]'
```

You can also toggle resources at runtime with `redisfx_debug add|remove <resource>`.

### Error events

Every failed command fires `redisfx:error` with `{ command, args, message, err, resource }`.

### Fivemanage Integration

A module for submitting error logs to [Fivemanage](https://fivemanage.com/) is included. Set the API key:

```lua
setr FIVEMANAGE_LOGS_API_KEY "your-api-key"
```

## Development

```sh
bun install
bun run typecheck
bun run test
bun run build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

LGPL-3.0. RedisFX is a derivative work of [oxmysql](https://github.com/overextended/oxmysql) —
see [NOTICE.md](./NOTICE.md) for attribution and the list of modifications.
