import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(status?: OrderStatus) {
    const where = status ? { status } : {};
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { items: true } } },
    });

    return {
      orders: orders.map((o) => ({
        orderId: o.id,
        referenceNumber: o.referenceNumber,
        status: o.status,
        totalAmount: o.totalAmount.toString(),
        itemCount: o._count.items,
        customerNote: o.customerNote,
        createdAt: o.createdAt,
      })),
      total: orders.length,
      limit: 50,
      offset: 0,
    };
  }

  async getOrderDetail(referenceNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { referenceNumber },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) throw new NotFoundException({ error: 'ORDER_NOT_FOUND' });

    return {
      orderId: order.id,
      referenceNumber: order.referenceNumber,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      customerNote: order.customerNote,
      items: order.items.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice.toString(),
        subtotal: oi.subtotal.toString(),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async updateOrderStatus(referenceNumber: string, newStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { referenceNumber } });
    if (!order) throw new NotFoundException({ error: 'ORDER_NOT_FOUND' });

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${order.status} to ${newStatus}`,
        currentStatus: order.status,
      });
    }

    const updated = await this.prisma.order.update({
      where: { referenceNumber },
      data: { status: newStatus },
    });

    return {
      referenceNumber,
      previousStatus: order.status,
      newStatus: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async toggleItemAvailability(itemId: string, isAvailable: boolean) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException({ error: 'ITEM_NOT_FOUND' });

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    return {
      itemId: updated.id,
      name: updated.name,
      isAvailable: updated.isAvailable,
      updatedAt: updated.updatedAt,
    };
  }
}
