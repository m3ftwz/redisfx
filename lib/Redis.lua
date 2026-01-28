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

local type = type
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

-- String commands
for _, method in pairs({
	'get', 'set', 'del', 'exists', 'expire', 'ttl', 'incr', 'incrby', 'decr', 'decrby', 'mget', 'mset',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Hash commands
for _, method in pairs({
	'hget', 'hset', 'hmset', 'hgetall', 'hdel', 'hincrby', 'hexists', 'hkeys', 'hvals', 'hlen',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- List commands
for _, method in pairs({
	'lpush', 'rpush', 'lpop', 'rpop', 'lrange', 'llen', 'lindex', 'lset', 'lrem',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Set commands
for _, method in pairs({
	'sadd', 'srem', 'smembers', 'sismember', 'scard', 'spop', 'srandmember',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Sorted set commands
for _, method in pairs({
	'zadd', 'zrange', 'zrangeWithScores', 'zrem', 'zscore', 'zrank', 'zcard', 'zincrby',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Key commands
for _, method in pairs({
	'keys', 'scan', 'type', 'rename', 'persist', 'pttl', 'expireat',
}) do
	Redis[method] = setmetatable({
		method = method,
		await = function(...)
			return await(redisfx[method], ...)
		end
	}, redis_method_mt)
end

-- Server and other commands
for _, method in pairs({
	'ping', 'flushdb', 'dbsize', 'multi', 'raw',
}) do
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

	redisfx.awaitConnection()

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
