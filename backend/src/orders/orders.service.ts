import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: { include: { menuItem: true } } } }>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    const referenceNumber = await this.generateReferenceNumber();
    return this.persistOrder(dto, referenceNumber);
  }

  async getOrderByRef(referenceNumber: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { referenceNumber },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) throw new NotFoundException({ error: 'ORDER_NOT_FOUND', message: '找不到此訂單' });
    return this.toResponseDto(order);
  }

  private async persistOrder(dto: CreateOrderDto, referenceNumber: string): Promise<OrderResponseDto> {
    const itemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({ where: { id: { in: itemIds } } });

    const unavailable = menuItems.filter((mi) => !mi.isAvailable);
    if (unavailable.length > 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        details: unavailable.map((mi) => ({ field: 'items', message: `${mi.name} 目前無供應` })),
      });
    }

    if (menuItems.length !== itemIds.length) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', message: '部分商品不存在' });
    }

    const priceMap = new Map(menuItems.map((mi) => [mi.id, mi.price]));
    let total = 0;
    const orderItems = dto.items.map((i) => {
      const unitPrice = Number(priceMap.get(i.menuItemId));
      const subtotal = unitPrice * i.quantity;
      total += subtotal;
      return { menuItemId: i.menuItemId, quantity: i.quantity, unitPrice, subtotal };
    });

    const order = await this.prisma.order.create({
      data: {
        referenceNumber,
        totalAmount: total,
        customerNote: dto.customerNote,
        items: { create: orderItems },
      },
      include: { items: { include: { menuItem: true } } },
    });

    return this.toResponseDto(order);
  }

  private async generateReferenceNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `ORD-${String(count + 1).padStart(5, '0')}`;
  }

  private toResponseDto(order: OrderWithItems): OrderResponseDto {
    return {
      orderId: order.id,
      referenceNumber: order.referenceNumber,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      customerNote: order.customerNote ?? undefined,
      items: order.items.map((oi) => ({
        menuItemId: oi.menuItemId,
        name: oi.menuItem.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice.toString(),
        subtotal: oi.subtotal.toString(),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
