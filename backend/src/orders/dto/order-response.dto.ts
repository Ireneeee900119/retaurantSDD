export class OrderItemResponseDto {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export class OrderResponseDto {
  orderId: string;
  referenceNumber: string;
  status: string;
  totalAmount: string;
  customerNote?: string;
  items: OrderItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
