import axios from 'axios';
import type {
  OrderStatus,
  StaffOrderDetail,
  StaffOrderListResponse,
  UpdateStatusResponse,
} from '../types/staff';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface ListOrdersParams {
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export async function listStaffOrders(
  params: ListOrdersParams = {},
): Promise<StaffOrderListResponse> {
  const { data } = await axios.get<StaffOrderListResponse>(`${BASE}/staff/orders`, {
    params: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.limit !== undefined ? { limit: params.limit } : {}),
      ...(params.offset !== undefined ? { offset: params.offset } : {}),
    },
  });
  return data;
}

export async function getStaffOrder(referenceNumber: string): Promise<StaffOrderDetail> {
  const { data } = await axios.get<StaffOrderDetail>(
    `${BASE}/staff/orders/${referenceNumber}`,
  );
  return data;
}

export async function updateStaffOrderStatus(
  referenceNumber: string,
  status: OrderStatus,
): Promise<UpdateStatusResponse> {
  const { data } = await axios.patch<UpdateStatusResponse>(
    `${BASE}/staff/orders/${referenceNumber}/status`,
    { status },
  );
  return data;
}
