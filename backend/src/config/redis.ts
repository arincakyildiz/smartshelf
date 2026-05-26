import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => {
  console.warn('Redis error (non-fatal):', err.message);
});

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache miss is non-fatal
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch {
      // Non-fatal
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Non-fatal
    }
  },
};

export default redis;
