import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const seedCategory = {
  id: 'cat-1',
  name: '手搖飲料',
  displayOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      categoryId: 'cat-1',
      name: '珍珠奶茶',
      description: null,
      price: 60,
      imageUrl: null,
      isAvailable: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockPrisma = {
  menuCategory: {
    findMany: jest.fn().mockResolvedValue([seedCategory]),
    findFirst: jest.fn(),
  },
  menuItem: { findUnique: jest.fn(), update: jest.fn() },
  order: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

describe('Menu API (e2e)', () => {
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

  describe('GET /api/v1/menu', () => {
    it('returns a { categories } wrapper, not a bare array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/menu')
        .expect(200);

      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(Array.isArray(res.body)).toBe(false);
    });

    it('each category contains id, name, displayOrder and items array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/menu')
        .expect(200);

      const [cat] = res.body.categories;
      expect(cat).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        displayOrder: expect.any(Number),
        items: expect.any(Array),
      });
    });

    it('each item contains id, name, price string, and isAvailable', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/menu')
        .expect(200);

      const [item] = res.body.categories[0].items;
      expect(item).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(String),
        isAvailable: expect.any(Boolean),
      });
    });
  });
});
