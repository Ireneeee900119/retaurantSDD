import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { MenuCategoryDto, MenuItemDto } from './dto/menu-response.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getFullMenu(): Promise<MenuCategoryDto[]> {
    const cached = await this.cache.get<MenuCategoryDto[]>('menu:full');
    if (cached) return cached;

    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const response = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      items: cat.items.map(this.toItemDto),
    }));

    await this.cache.set('menu:full', response, 60);
    return response;
  }

  async getCategoryItems(categoryId: string): Promise<{ categoryId: string; categoryName: string; items: MenuItemDto[] }> {
    const cacheKey = `menu:category:${categoryId}`;
    const cached = await this.cache.get<{ categoryId: string; categoryName: string; items: MenuItemDto[] }>(cacheKey);
    if (cached) return cached;

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, isActive: true },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!category) throw new NotFoundException({ error: 'CATEGORY_NOT_FOUND', message: 'Category not found or inactive' });

    const response = {
      categoryId: category.id,
      categoryName: category.name,
      items: category.items.map(this.toItemDto),
    };

    await this.cache.set(cacheKey, response, 60);
    return response;
  }

  async getItem(itemId: string): Promise<MenuItemDto> {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException({ error: 'ITEM_NOT_FOUND', message: 'Menu item not found' });
    return this.toItemDto(item);
  }

  private toItemDto(item: any): MenuItemDto {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
    };
  }
}
