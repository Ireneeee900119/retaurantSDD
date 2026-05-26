import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { StaffService } from './staff.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('orders')
  listOrders(@Query('status') status?: OrderStatus) {
    return this.staffService.listOrders(status);
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

  @Patch('menu/items/:itemId/availability')
  toggleAvailability(
    @Param('itemId') itemId: string,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.staffService.toggleItemAvailability(itemId, body.isAvailable);
  }
}
