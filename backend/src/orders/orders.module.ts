import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderQueueService } from './queue/order-queue.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderQueueService],
  exports: [OrderQueueService],
})
export class OrdersModule {}
