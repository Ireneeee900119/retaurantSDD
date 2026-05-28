import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private store = new Map<string, CacheEntry>();
  private readonly redis?: Redis;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }

    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSecs: number): Promise<void> {
    if (this.redis) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSecs);
      return;
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSecs * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }

    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys(`${prefix}*`);
      if (keys.length > 0) await this.redis.del(...keys);
      return;
    }

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async ping(): Promise<'redis' | 'memory'> {
    if (!this.redis) return 'memory';
    await this.redis.ping();
    return 'redis';
  }
}
