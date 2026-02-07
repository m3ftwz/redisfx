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
```

### Connection String Formats

**URL format (recommended):**
```
redis://localhost:6379
redis://localhost:6379/0
redis://username:password@localhost:6379/0
rediss://localhost:6379  # TLS connection
```

**Key-value format:**
```
host=localhost;port=6379;password=secret;database=0
```

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

## Commands Reference

### String Commands
`get`, `set`, `del`, `exists`, `expire`, `ttl`, `incr`, `incrby`, `decr`, `decrby`, `mget`, `mset`

### Hash Commands
`hget`, `hset`, `hmset`, `hgetall`, `hdel`, `hincrby`, `hexists`, `hkeys`, `hvals`, `hlen`

### List Commands
`lpush`, `rpush`, `lpop`, `rpop`, `lrange`, `llen`, `lindex`, `lset`, `lrem`

### Set Commands
`sadd`, `srem`, `smembers`, `sismember`, `scard`, `spop`, `srandmember`

### Sorted Set Commands
`zadd`, `zrange`, `zrangeWithScores`, `zrem`, `zscore`, `zrank`, `zcard`, `zincrby`

### Key Commands
`keys`, `scan`, `type`, `rename`, `persist`, `pttl`, `expireat`

### Server Commands
`ping`, `flushdb`, `dbsize`

### Other
`multi` (transactions), `raw` (execute any Redis command)

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

### Fivemanage Integration

A module for submitting error logs to [Fivemanage](https://fivemanage.com/) is included. Set the API key:

```lua
setr FIVEMANAGE_LOGS_API_KEY "your-api-key"
```

## License

LGPL-3.0
