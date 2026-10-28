import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { StaffService } from './staff.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ToggleItemAvailabilityDto } from './dto/toggle-item-availability.dto';
import { ToggleCategoryActiveDto } from './dto/toggle-category-active.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('orders')
  listOrders(
    @Query('status') status?: OrderStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.staffService.listOrders(
      status,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }

  @Get('orders/:referenceNumber')
  getOrder(@Param('referenceNumber') ref: string) {
    return this.staffService.getOrderDetail(ref);
  }

  @Patch('orders/:referenceNumber/status')
  updateStatus(
    @Param('referenceNumber') ref: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.staffService.updateOrderStatus(ref, dto.status);
  }

  @Get('menu/categories')
  listAllCategories() {
    return this.staffService.listAllCategoriesForAdmin();
  }

  @Patch('menu/items/:itemId/availability')
  toggleAvailability(
    @Param('itemId') itemId: string,
    @Body() dto: ToggleItemAvailabilityDto,
  ) {
    return this.staffService.toggleItemAvailability(itemId, dto.isAvailable);
  }

  @Patch('menu/categories/:categoryId/active')
  toggleCategoryActive(
    @Param('categoryId') categoryId: string,
    @Body() dto: ToggleCategoryActiveDto,
  ) {
    return this.staffService.toggleCategoryActive(categoryId, dto.isActive);
  }
}
