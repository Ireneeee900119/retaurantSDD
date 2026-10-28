import type { OrderStatus } from '../../types/staff';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: '已收到訂單',
  PREPARING: '製作中',
  READY: '已完成',
  DELIVERED: '已送達',
  CANCELLED: '已取消',
};

export const STATUS_FILTERS: { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'RECEIVED', label: '已收到訂單' },
  { value: 'PREPARING', label: '製作中' },
  { value: 'READY', label: '已完成' },
  { value: 'DELIVERED', label: '已送達' },
  { value: 'CANCELLED', label: '已取消' },
];

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const TRANSITION_LABELS: Record<OrderStatus, string> = {
  RECEIVED: '標記為已收到',
  PREPARING: '開始製作',
  READY: '標記為已完成',
  DELIVERED: '標記為已送達',
  CANCELLED: '取消訂單',
};

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
