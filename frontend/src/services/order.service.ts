import axios from 'axios';
import type { OrderResponse, PlaceOrderRequest } from '../types/order';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function placeOrder(req: PlaceOrderRequest): Promise<OrderResponse> {
  const { data } = await axios.post<OrderResponse>(`${BASE}/orders`, req);
  return data;
}

export async function getOrderStatus(referenceNumber: string): Promise<OrderResponse> {
  const { data } = await axios.get<OrderResponse>(`${BASE}/orders/${referenceNumber}`);
  return data;
}
