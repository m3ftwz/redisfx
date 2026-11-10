-- Run with Lua 5.4 (or fengari). The export stub verifies the Lua/JS call boundary without FXServer.
GetCurrentResourceName = function() return 'lua-test' end
GetNumResourceMetadata = function() return 0 end
GetResourceState = function() return 'started' end
promise = {
    new = function()
        return {
            resolve = function(self, value) self.value = value end,
            reject = function(self, message) self.error = message end,
        }
    end,
}
Citizen = {
    Await = function(p)
        if p.error then error(p.error) end
        return p.value
    end,
}

local seen
local failure
exports = {
    redisfx = setmetatable({}, {
        __index = function(_, method)
            return function(_, ...)
                local args = table.pack(...)
                seen = { method = method, args = args }
                local cb = args[args.n - 2]
                if cb then cb('RESULT', failure) end
            end
        end,
    }),
}

dofile('lib/Redis.lua')

local function check(method, arity, isPromise)
    assert(seen.method == method)
    assert(seen.args.n == arity + 3, 'wrong argument count for ' .. method)
    assert(seen.args[arity + 2] == 'lua-test', 'resource shifted for ' .. method)
    assert(seen.args[arity + 3] == isPromise, 'promise flag shifted for ' .. method)
end

-- Missing callbacks must occupy a nil slot instead of being replaced by the resource name.
Redis.get('key')
check('get', 1, false)
assert(seen.args[1] == 'key' and seen.args[2] == nil)

-- Omitted options and explicit nils must not shift the await callback or resource identity.
assert(Redis.set.await('key', 'value') == 'RESULT')
check('set', 3, true)
assert(seen.args[3] == nil and type(seen.args[4]) == 'function')
assert(Redis.set.await('key', 'value', nil) == 'RESULT')
check('set', 3, true)

local result
local cb = function(value) result = value end
Redis.set('key', 'value', cb)
check('set', 3, false)
assert(seen.args[3] == nil and seen.args[4] == cb and result == 'RESULT')
Redis.set('key', 'value', { EX = 60 }, cb)
check('set', 3, false)
assert(seen.args[3].EX == 60 and seen.args[4] == cb)

assert(Redis.blessScan.await(0, 'NO-EVICT') == 'RESULT')
check('blessScan', 3, true)
assert(seen.args[1] == 0 and seen.args[2] == 'NO-EVICT' and seen.args[3] == nil)
Redis.blessScan(0, 'NO-EVICT', { COUNT = 100 })
check('blessScan', 3, false)
assert(seen.args[3].COUNT == 100 and seen.args[4] == nil)

-- FiveM can represent a callable callback as a function-reference table.
local reference = setmetatable({ __cfx_functionReference = 'ref' }, { __call = function(_, value) result = value end })
Redis.get('key', reference)
check('get', 1, false)
assert(seen.args[2] == reference)

failure = 'ERR failed'
local ok, message = pcall(Redis.get.await, 'key')
assert(not ok and message:find('ERR failed', 1, true))
failure = nil

assert(Redis.Sync.get('key') == 'RESULT')
check('get', 1, true)
Redis.Async.set('key', 'value', cb)
check('set', 3, false)

-- Check every declared method with no user arguments: all reserved slots must still be present.
local count = 0
for name, method in pairs(Redis) do
    if type(method) == 'table' and rawget(method, 'argumentCount') then
        assert(method.await() == 'RESULT')
        check(name, method.argumentCount, true)
        method()
        check(name, method.argumentCount, false)
        assert(seen.args[method.argumentCount + 1] == nil)
        count = count + 1
    end
end
assert(count > 120)
print(('Lua wrapper regression checks passed for %d commands'):format(count))
