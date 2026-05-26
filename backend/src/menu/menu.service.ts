import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MenuCategoryDto, MenuItemDto } from './dto/menu-response.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullMenu(): Promise<MenuCategoryDto[]> {
    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      items: cat.items.map(this.toItemDto),
    }));
  }

  async getCategoryItems(categoryId: string): Promise<{ categoryId: string; categoryName: string; items: MenuItemDto[] }> {
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, isActive: true },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!category) throw new NotFoundException({ error: 'CATEGORY_NOT_FOUND', message: 'Category not found or inactive' });

    return {
      categoryId: category.id,
      categoryName: category.name,
      items: category.items.map(this.toItemDto),
    };
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
