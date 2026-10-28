import type { MenuItem } from './menu';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: string;
}

export interface OrderItemResponse {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface OrderResponse {
  orderId: string;
  referenceNumber: string;
  status: string;
  totalAmount: string;
  customerNote?: string;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderRequest {
  items: { menuItemId: string; quantity: number }[];
  customerNote?: string;
}
