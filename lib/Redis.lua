local promise = promise
local Await = Citizen.Await
local resourceName = GetCurrentResourceName()
local GetResourceState = GetResourceState

local options = {
	return_callback_errors = false
}

for i = 1, GetNumResourceMetadata(resourceName, 'redis_option') do
	local option = GetResourceMetadata(resourceName, 'redis_option', i - 1)
	options[option] = true
end

local function await(fn, ...)
	local p = promise.new()
	local args = {...}
	table.insert(args, function(result, error)
		if error then
			return p:reject(error)
		end
		p:resolve(result)
	end)
	table.insert(args, resourceName)
	table.insert(args, true)

	fn(nil, table.unpack(args))

	return Await(p)
end

local redisfx = exports['redisfx']

local redis_method_mt = {
	__call = function(self, ...)
		local args = {...}
		table.insert(args, resourceName)
		table.insert(args, options.return_callback_errors)
		return redisfx[self.method](nil, table.unpack(args))
	end
}

local Redis = setmetatable(Redis or {}, {
	__index = function(_, index)
		return function(...)
			return redisfx[index](nil, ...)
		end
	end
})

--- Every export exposed by the resource. Each becomes `Redis.<name>(...)` for the callback style
--- and `Redis.<name>.await(...)` / `Redis.Sync.<name>(...)` for the blocking style.
local methods = {
	-- String
	'get', 'set', 'getdel', 'getex', 'getrange', 'setrange', 'append', 'strlen', 'setnx',
	'incr', 'incrby', 'incrbyfloat', 'decr', 'decrby', 'mget', 'mset', 'msetnx',

	-- Key
	'del', 'unlink', 'exists', 'touch', 'expire', 'pexpire', 'expireat', 'pexpireat',
	'expiretime', 'pexpiretime', 'ttl', 'pttl', 'persist', 'type', 'rename', 'renamenx',
	'randomkey', 'keys', 'copy', 'scan', 'objectEncoding', 'memoryUsage', 'dump', 'restore',

	-- Hash
	'hget', 'hset', 'hsetnx', 'hmset', 'hgetall', 'hmget', 'hdel', 'hincrby', 'hincrbyfloat',
	'hexists', 'hkeys', 'hvals', 'hlen', 'hstrlen', 'hrandfield', 'hscan',
	-- Hash field expiration (Redis 7.4+) and HGETEX/HGETDEL (Redis 8.0+)
	'hexpire', 'hpexpire', 'hexpireat', 'hpexpireat', 'httl', 'hpttl', 'hpersist',
	'hgetex', 'hgetdel',

	-- List
	'lpush', 'rpush', 'lpushx', 'rpushx', 'lpop', 'rpop', 'lrange', 'llen', 'lindex', 'lset',
	'lrem', 'ltrim', 'lpos', 'linsert', 'lmove', 'rpoplpush', 'lmpop',

	-- Set
	'sadd', 'srem', 'smembers', 'sismember', 'smismember', 'scard', 'spop', 'smove',
	'srandmember', 'sinter', 'sunion', 'sdiff', 'sintercard', 'sinterstore', 'sunionstore',
	'sdiffstore', 'sscan',

	-- Sorted set
	'zadd', 'zrange', 'zrangeWithScores', 'zrangebyscore', 'zrangestore', 'zrem', 'zscore',
	'zmscore', 'zrank', 'zrevrank', 'zcard', 'zcount', 'zlexcount', 'zincrby', 'zpopmin',
	'zpopmax', 'zrandmember', 'zdiff', 'zinter', 'zunion', 'zintercard', 'zremrangebyrank',
	'zremrangebyscore', 'zremrangebylex', 'zscan',

	-- Bitmap / HyperLogLog
	'setbit', 'getbit', 'bitcount', 'bitpos', 'bitop', 'pfadd', 'pfcount', 'pfmerge',

	-- Streams
	'xadd', 'xlen', 'xrange', 'xrevrange', 'xdel', 'xtrim', 'xack',

	-- Scripting
	'eval', 'evalsha', 'scriptLoad', 'fcall', 'fcallRo',

	-- Pub/Sub - subscribed messages arrive as the `redisfx:message` server event
	'publish', 'spublish', 'subscribe', 'unsubscribe',

	-- Transactions
	'multi',

	-- Server
	'ping', 'time', 'dbsize', 'flushdb', 'flushall', 'info', 'configGet',

	-- Raw
	'raw',
}

for _, method in ipairs(methods) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Sync/Async aliases for compatibility
local alias_mt = {
	__index = function(self, key)
		local method = Redis[key]
		if method then
			Redis.Async[key] = method
			Redis.Sync[key] = method.await
			return self[key]
		end
	end
}

Redis.Sync = setmetatable({}, alias_mt)
Redis.Async = setmetatable({}, alias_mt)

local function onReady(cb)
	while GetResourceState('redisfx') ~= 'started' do
		Wait(50)
	end

	-- The resource being started only means the script loaded; wait for the socket as well so a
	-- ready callback can issue commands immediately.
	while not redisfx.isReady() do
		Wait(50)
	end

	return cb and cb() or true
end

Redis.ready = setmetatable({
	await = onReady
}, {
	__call = function(_, cb)
		Citizen.CreateThreadNow(function() onReady(cb) end)
	end,
})

_ENV.Redis = Redis
