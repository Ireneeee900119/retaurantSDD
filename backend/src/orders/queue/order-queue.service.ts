import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { OrdersService } from '../orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';

export interface CreateOrderJob {
  dto: CreateOrderDto;
  referenceNumber: string;
  idempotencyKey: string;
}

@Injectable()
export class OrderQueueService implements OnModuleInit, OnModuleDestroy {
  private connection?: { host: string; port: number; maxRetriesPerRequest: null };
  private queue?: Queue<CreateOrderJob, void, 'create-order'>;
  private worker?: Worker<CreateOrderJob, void, 'create-order'>;

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit() {
    if (!process.env.REDIS_URL) return;

    const redisUrl = new URL(process.env.REDIS_URL);
    this.connection = {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<CreateOrderJob, void, 'create-order'>('orders', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 86400 },
      },
    });

    this.worker = new Worker<CreateOrderJob, void, 'create-order'>(
      'orders',
      async (job) => {
        await this.ordersService.createQueuedOrder(job.data.dto, job.data.referenceNumber, job.data.idempotencyKey);
      },
      { connection: this.connection, concurrency: Number(process.env.ORDER_WORKER_CONCURRENCY ?? 4) },
    );
  }

  async enqueue(job: CreateOrderJob) {
    if (!this.queue) {
      throw new ServiceUnavailableException({
        error: 'QUEUE_UNAVAILABLE',
        message: 'Redis queue is not configured',
      });
    }

    const counts = await this.queue.getJobCounts('waiting', 'delayed', 'active');
    const depth = counts.waiting + counts.delayed + counts.active;
    const maxDepth = Number(process.env.MAX_ORDER_QUEUE_DEPTH ?? 1000);

    if (depth >= maxDepth) {
      throw new ServiceUnavailableException({
        error: 'QUEUE_BACKPRESSURE',
        message: 'Order queue is full, please retry later',
        retryAfterSeconds: 5,
      });
    }

    await this.queue.add('create-order', job, { jobId: job.idempotencyKey });
    return { depth: depth + 1 };
  }

  async stats() {
    if (!this.queue) return { mode: 'disabled' };
    return {
      mode: 'bullmq',
      ...(await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')),
    };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
