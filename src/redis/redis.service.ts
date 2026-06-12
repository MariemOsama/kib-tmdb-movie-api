import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(
      config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
      {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      },
    );
  }

  async ping(): Promise<void> {
    await this.ensureConnected();
    await this.client.ping();
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      return;
    }
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    try {
      await this.ensureConnected();
      const value = await this.client.get(key);
      const parsedValue = Number(value);
      return Number.isInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallback;
    } catch {
      return fallback;
    }
  }

  async increment(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.incr(key);
    } catch {
      return;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
