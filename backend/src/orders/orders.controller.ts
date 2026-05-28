import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueueService } from './queue/order-queue.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderQueue: OrderQueueService,
  ) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @Res({ passthrough: true }) res: Response) {
    if (process.env.ORDER_MODE === 'async') {
      const { shouldEnqueue, ...ticket } = await this.ordersService.createQueuedTicket(dto);
      if (shouldEnqueue) {
        await this.orderQueue.enqueue({
          dto,
          referenceNumber: ticket.referenceNumber,
          idempotencyKey: dto.idempotencyKey!,
        });
      }
      res.status(ticket.status === 'QUEUED' ? 202 : 200);
      return ticket;
    }

    return this.ordersService.createOrder(dto);
  }

  @Get(':referenceNumber')
  getOrder(@Param('referenceNumber') ref: string) {
    return this.ordersService.getOrderByRef(ref);
  }
}
