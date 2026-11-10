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

local redisfx = exports['redisfx']

--- Keep callback/resource arguments in fixed slots even when options or the callback are omitted.
local function execute(method, argumentCount, isPromise, callback, ...)
	local args = table.pack(...)

	if not callback and args.n > 0 then
		local last = args[args.n]
		if type(last) == 'function' or (type(last) == 'table' and last.__cfx_functionReference) then
			callback = last
			args[args.n] = nil
		end
	end

	args[argumentCount + 1] = callback
	args[argumentCount + 2] = resourceName
	args[argumentCount + 3] = isPromise

	return redisfx[method](nil, table.unpack(args, 1, argumentCount + 3))
end

local function await(method, argumentCount, ...)
	local p = promise.new()
	execute(method, argumentCount, true, function(result, error)
		if error then
			return p:reject(error)
		end
		p:resolve(result)
	end, ...)

	return Await(p)
end
local redis_method_mt = {
	__call = function(self, ...)
		return execute(self.method, self.argumentCount, options.return_callback_errors, nil, ...)
	end
}

local Redis = setmetatable(Redis or {}, {
	__index = function(_, index)
		return function(...)
			return redisfx[index](nil, ...)
		end
	end
})

--- Every command export and its number of user arguments (including optional arguments).
--- Each becomes `Redis.<name>(...)` for the callback style
--- and `Redis.<name>.await(...)` / `Redis.Sync.<name>(...)` for the blocking style.
local methods = {
	-- String
	get = 1, set = 3, getdel = 1, getex = 2, getrange = 3, setrange = 3, append = 2, strlen = 1, setnx = 2,
	incr = 1, incrby = 2, incrbyfloat = 2, decr = 1, decrby = 2, mget = 1, mset = 1, msetnx = 1,

	-- Key
	del = 1, unlink = 1, exists = 1, touch = 1, expire = 2, pexpire = 2, expireat = 2, pexpireat = 2,
	expiretime = 1, pexpiretime = 1, ttl = 1, pttl = 1, persist = 1, type = 1, rename = 2, renamenx = 2,
	randomkey = 0, keys = 1, copy = 3, scan = 2, objectEncoding = 1, memoryUsage = 1, dump = 1, restore = 3,
	-- Key eviction protection (Redis 8.12+)
	blessSet = 2, blessGet = 1, blessClear = 2, blessScan = 3,

	-- Hash
	hget = 2, hset = 3, hsetnx = 3, hmset = 2, hgetall = 1, hmget = 2, hdel = 2, hincrby = 3, hincrbyfloat = 3,
	hexists = 2, hkeys = 1, hvals = 1, hlen = 1, hstrlen = 2, hrandfield = 1, hscan = 3,
	-- Hash field expiration (Redis 7.4+) and HGETEX/HGETDEL (Redis 8.0+)
	hexpire = 3, hpexpire = 3, hexpireat = 3, hpexpireat = 3, httl = 2, hpttl = 2, hpersist = 2,
	hgetex = 3, hgetdel = 2,

	-- List
	lpush = 2, rpush = 2, lpushx = 2, rpushx = 2, lpop = 1, rpop = 1, lrange = 3, llen = 1, lindex = 2, lset = 3,
	lrem = 3, ltrim = 3, lpos = 3, linsert = 4, lmove = 4, rpoplpush = 2, lmpop = 3,

	-- Set
	sadd = 2, srem = 2, smembers = 1, sismember = 2, smismember = 2, scard = 1, spop = 1, smove = 3,
	srandmember = 2, sinter = 1, sunion = 1, sdiff = 1, sintercard = 2, sinterstore = 2, sunionstore = 2,
	sdiffstore = 2, sscan = 3,

	-- Sorted set
	zadd = 4, zrange = 3, zrangeWithScores = 3, zrangebyscore = 3, zrangestore = 4, zrem = 2, zscore = 2,
	zmscore = 2, zrank = 2, zrevrank = 2, zcard = 1, zcount = 3, zlexcount = 3, zincrby = 3, zpopmin = 1,
	zpopmax = 1, zrandmember = 1, zdiff = 1, zinter = 1, zunion = 1, zintercard = 2, zremrangebyrank = 3,
	zremrangebyscore = 3, zremrangebylex = 3, zscan = 3,

	-- Bitmap / HyperLogLog
	setbit = 3, getbit = 2, bitcount = 2, bitpos = 3, bitop = 3, pfadd = 2, pfcount = 1, pfmerge = 2,

	-- Streams
	xadd = 3, xlen = 1, xrange = 3, xrevrange = 3, xdel = 2, xtrim = 3, xack = 3,

	-- Scripting
	eval = 2, evalsha = 2, scriptLoad = 1, fcall = 2, fcallRo = 2,

	-- Pub/Sub - subscribed messages arrive as the `redisfx:message` server event
	publish = 2, spublish = 2, subscribe = 2, unsubscribe = 2,

	-- Transactions
	multi = 1,

	-- Server
	ping = 0, time = 0, dbsize = 0, flushdb = 0, flushall = 0, info = 1, configGet = 1,

	-- Raw
	raw = 2,
}

for method, argumentCount in pairs(methods) do
	Redis[method] = setmetatable({
		method = method,
		argumentCount = argumentCount,
		await = function(...)
			return await(method, argumentCount, ...)
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
