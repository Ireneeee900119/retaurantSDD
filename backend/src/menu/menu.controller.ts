import { Controller, Get, Param } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  getFullMenu() {
    return this.menuService.getFullMenu();
  }

  @Get('categories/:categoryId/items')
  getCategoryItems(@Param('categoryId') categoryId: string) {
    return this.menuService.getCategoryItems(categoryId);
  }

  @Get('items/:itemId')
  getItem(@Param('itemId') itemId: string) {
    return this.menuService.getItem(itemId);
  }
}
