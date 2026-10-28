import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderStatus, StaffOrderListItem } from '../../types/staff';
import { listStaffOrders } from '../../services/staff.service';
import { STATUS_FILTERS, STATUS_LABELS, formatDateTime } from './statusConfig';
import './staff.css';

const PAGE_SIZE = 20;

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<StaffOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextFilter: OrderStatus | 'ALL', nextOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listStaffOrders({
          status: nextFilter === 'ALL' ? undefined : nextFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setOrders(res.orders);
        setTotal(res.total);
      } catch {
        setError('無法載入訂單列表，請稍後再試');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(filter, offset);
  }, [filter, offset, load]);

  const handleFilterChange = (next: OrderStatus | 'ALL') => {
    if (next === filter) return;
    setFilter(next);
    setOffset(0);
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="staff-page">
      <header className="page-header">
        <h1>訂單管理</h1>
      </header>

      <div className="staff-filters" role="tablist" aria-label="訂單狀態篩選">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`staff-filter-chip ${filter === f.value ? 'active' : ''}`}
            onClick={() => handleFilterChange(f.value)}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="center">載入中...</div>}
      {error && !loading && <p className="error">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="staff-empty">目前沒有訂單</div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="staff-orders-list">
          {orders.map((o) => (
            <li key={o.orderId}>
              <Link
                to={`/staff/orders/${o.referenceNumber}`}
                className="staff-order-row"
              >
                <div className="staff-order-row-head">
                  <span className="staff-order-ref">{o.referenceNumber}</span>
                  <span
                    className={`status-badge status-${o.status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <div className="staff-order-total">NT$ {o.totalAmount}</div>
                <div className="staff-order-meta">
                  <span>{o.itemCount} 項品項</span>
                  <span>{formatDateTime(o.createdAt)}</span>
                </div>
                {o.customerNote && (
                  <div className="staff-order-note">備註：{o.customerNote}</div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && total > 0 && (
        <div className="staff-pagination">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            上一頁
          </button>
          <span className="staff-pagination-info">
            第 {page} / {totalPages} 頁（共 {total} 筆）
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
