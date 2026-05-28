import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.findExistingIdempotentOrder(dto.idempotencyKey, this.hashDto(dto));
      if (existing) return existing;
    }

    const referenceNumber = this.generateReferenceNumber();
    const response = await this.persistOrder(dto, referenceNumber);

    if (dto.idempotencyKey) {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: dto.idempotencyKey,
          referenceNumber,
          requestHash: this.hashDto(dto),
          status: 'COMPLETED',
        },
      });
    }

    return response;
  }

  async createQueuedTicket(dto: CreateOrderDto): Promise<OrderResponseDto & { shouldEnqueue: boolean }> {
    if (!dto.idempotencyKey) {
      throw new BadRequestException({
        error: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'High-concurrency order submission requires idempotencyKey',
      });
    }

    const requestHash = this.hashDto(dto);
    const existing = await this.findExistingIdempotentOrder(dto.idempotencyKey, requestHash);
    if (existing) return { ...existing, shouldEnqueue: false };

    const referenceNumber = this.generateReferenceNumber();
    try {
      const record = await this.prisma.idempotencyRecord.create({
        data: {
          key: dto.idempotencyKey,
          referenceNumber,
          requestHash,
          status: 'QUEUED',
        },
      });

      return { ...this.toQueuedResponse(record.referenceNumber, record.createdAt, record.updatedAt), shouldEnqueue: true };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const racedExisting = await this.findExistingIdempotentOrder(dto.idempotencyKey, requestHash);
        if (racedExisting) return { ...racedExisting, shouldEnqueue: false };
      }
      throw error;
    }
  }

  async createQueuedOrder(dto: CreateOrderDto, referenceNumber: string, idempotencyKey: string): Promise<OrderResponseDto> {
    const response = await this.persistOrder(dto, referenceNumber);
    await this.prisma.idempotencyRecord.update({
      where: { key: idempotencyKey },
      data: { status: 'COMPLETED' },
    });
    await this.cache.del(`order:status:${referenceNumber}`);
    return response;
  }

  private async persistOrder(dto: CreateOrderDto, referenceNumber: string): Promise<OrderResponseDto> {
    const itemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
    });

    const unavailable = menuItems.filter((mi) => !mi.isAvailable);
    if (unavailable.length > 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        details: unavailable.map((mi) => ({
          field: 'items',
          message: `${mi.name} 目前無供應`,
        })),
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
        items: {
          create: orderItems,
        },
      },
      include: { items: { include: { menuItem: true } } },
    });

    return this.toResponseDto(order);
  }

  async getOrderByRef(referenceNumber: string): Promise<OrderResponseDto> {
    const cachedStatus = await this.cache.get<string>(`order:status:${referenceNumber}`);
    if (cachedStatus === 'QUEUED') {
      const record = await this.prisma.idempotencyRecord.findUnique({ where: { referenceNumber } });
      if (record) return this.toQueuedResponse(record.referenceNumber, record.createdAt, record.updatedAt);
    }

    const order = await this.prisma.order.findUnique({
      where: { referenceNumber },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) {
      const record = await this.prisma.idempotencyRecord.findUnique({ where: { referenceNumber } });
      if (record && record.status === 'QUEUED') {
        await this.cache.set(`order:status:${referenceNumber}`, 'QUEUED', 30);
        return this.toQueuedResponse(record.referenceNumber, record.createdAt, record.updatedAt);
      }
      throw new NotFoundException({ error: 'ORDER_NOT_FOUND', message: '找不到此訂單' });
    }
    return this.toResponseDto(order);
  }

  private async findExistingIdempotentOrder(idempotencyKey: string, requestHash: string): Promise<OrderResponseDto | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
    if (!record) return null;
    if (record.requestHash !== requestHash) {
      throw new ConflictException({
        error: 'IDEMPOTENCY_KEY_REUSED',
        message: 'idempotencyKey was already used for a different payload',
      });
    }

    const order = await this.prisma.order.findUnique({
      where: { referenceNumber: record.referenceNumber },
      include: { items: { include: { menuItem: true } } },
    });

    return order ? this.toResponseDto(order) : this.toQueuedResponse(record.referenceNumber, record.createdAt, record.updatedAt);
  }

  private hashDto(dto: CreateOrderDto): string {
    const payload = {
      items: [...dto.items].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId)),
      customerNote: dto.customerNote ?? '',
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private generateReferenceNumber(): string {
    return `ORD-${Date.now().toString(36).toUpperCase().slice(-7)}${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private toQueuedResponse(referenceNumber: string, createdAt: Date, updatedAt: Date): OrderResponseDto {
    return {
      orderId: 'queued',
      referenceNumber,
      status: 'QUEUED',
      totalAmount: '0',
      items: [],
      createdAt,
      updatedAt,
    };
  }

  private toResponseDto(order: any): OrderResponseDto {
    return {
      orderId: order.id,
      referenceNumber: order.referenceNumber,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      customerNote: order.customerNote ?? undefined,
      items: order.items.map((oi: any) => ({
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
