import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { OrderQueueService } from '../orders/queue/order-queue.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly orderQueue: OrderQueueService,
  ) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'ok',
      cache: await this.cache.ping(),
      queue: await this.orderQueue.stats(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
