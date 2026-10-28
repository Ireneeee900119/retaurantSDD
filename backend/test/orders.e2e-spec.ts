import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ITEM_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ORDER_ID = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

const seedMenuItem = {
  id: ITEM_ID,
  categoryId: 'cat-1',
  name: '珍珠奶茶',
  description: null,
  price: 60,
  imageUrl: null,
  isAvailable: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeOrder = (referenceNumber: string) => ({
  id: ORDER_ID,
  referenceNumber,
  status: 'RECEIVED',
  totalAmount: { toString: () => '120' },
  customerNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'oi-1',
      orderId: ORDER_ID,
      menuItemId: ITEM_ID,
      quantity: 2,
      unitPrice: { toString: () => '60' },
      subtotal: { toString: () => '120' },
      menuItem: { name: '珍珠奶茶' },
    },
  ],
});

const mockPrisma = {
  menuCategory: { findMany: jest.fn(), findFirst: jest.fn() },
  menuItem: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  order: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/orders', () => {
    const validDto = {
      items: [{ menuItemId: ITEM_ID, quantity: 2 }],
    };

    it('referenceNumber is in ORD-NNNNN format', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([seedMenuItem]);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue(makeOrder('ORD-00001'));

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(validDto)
        .expect(201);

      expect(res.body.referenceNumber).toMatch(/^ORD-\d{5}$/);
    });

    it('referenceNumber increments with order count (count=4 → ORD-00005)', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([seedMenuItem]);
      mockPrisma.order.count.mockResolvedValue(4);
      mockPrisma.order.create.mockResolvedValue(makeOrder('ORD-00005'));

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(validDto)
        .expect(201);

      expect(res.body.referenceNumber).toBe('ORD-00005');
    });

    it('rejects a request with no items (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({})
        .expect(400);
    });

    it('returns expected shape: orderId, referenceNumber, status, totalAmount, items', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([seedMenuItem]);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue(makeOrder('ORD-00001'));

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(validDto)
        .expect(201);

      expect(res.body).toMatchObject({
        orderId: expect.any(String),
        referenceNumber: expect.any(String),
        status: 'RECEIVED',
        totalAmount: expect.any(String),
        items: expect.any(Array),
      });
    });
  });
});
