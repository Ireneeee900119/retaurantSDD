export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface StaffOrderListItem {
  orderId: string;
  referenceNumber: string;
  status: OrderStatus;
  totalAmount: string;
  itemCount: number;
  customerNote: string | null;
  createdAt: string;
}

export interface StaffOrderListResponse {
  orders: StaffOrderListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StaffOrderItem {
  name: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface StaffOrderDetail {
  orderId: string;
  referenceNumber: string;
  status: OrderStatus;
  totalAmount: string;
  customerNote: string | null;
  items: StaffOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStatusResponse {
  referenceNumber: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  updatedAt: string;
}
