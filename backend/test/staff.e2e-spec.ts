import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const seedOrder = {
  id: 'b1ffcd00-ad1c-4fa9-bc7e-7cc0ce491b22',
  referenceNumber: 'ORD-00001',
  status: 'RECEIVED',
  totalAmount: { toString: () => '120' },
  customerNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { items: 2 },
};

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

describe('Staff API (e2e)', () => {
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

  describe('GET /api/v1/staff/orders', () => {
    it('total is COUNT(*), not orders.length — returns 1 order but total=42', async () => {
      mockPrisma.$transaction.mockResolvedValue([[seedOrder], 42]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/orders')
        .expect(200);

      expect(res.body.orders).toHaveLength(1);
      expect(res.body.total).toBe(42);
    });

    it('default limit is 50 and offset is 0', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/orders')
        .expect(200);

      expect(res.body.limit).toBe(50);
      expect(res.body.offset).toBe(0);
    });

    it('honours limit and offset query params', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/orders?limit=10&offset=20')
        .expect(200);

      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(20);
    });

    it('caps limit at 200', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/orders?limit=999')
        .expect(200);

      expect(res.body.limit).toBe(200);
    });

    it('response shape includes orders array, total, limit, offset', async () => {
      mockPrisma.$transaction.mockResolvedValue([[seedOrder], 1]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/orders')
        .expect(200);

      expect(res.body).toMatchObject({
        orders: expect.any(Array),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number),
      });
    });
  });
});
