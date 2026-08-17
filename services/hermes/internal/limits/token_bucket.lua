-- Atomic token-bucket check-and-consume. Redis serializes script
-- execution, so this is race-free across hermes's horizontally scaled,
-- otherwise-stateless instances (docs/adr/0004-media-and-traffic-limits.md).
--
-- KEYS[1] = bucket key
-- ARGV[1] = capacity (burst)
-- ARGV[2] = refill rate, tokens per second
-- ARGV[3] = now, unix seconds (float)
-- ARGV[4] = cost of this request, in tokens
--
-- Returns {allowed (0/1), tokens_remaining_as_string}. Tokens are
-- returned as a string because Redis truncates Lua numbers to integers
-- when they cross the Lua->RESP boundary, which would destroy the
-- fractional remainder a sub-1-token-per-second refill rate needs.
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed = math.max(0, now - ts)
tokens = math.min(capacity, tokens + elapsed * refill_rate)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', KEYS[1], 'tokens', tostring(tokens), 'ts', tostring(now))
redis.call('EXPIRE', KEYS[1], 3600)

return {allowed, tostring(tokens)}
