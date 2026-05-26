import { useState } from 'react';
import type { OrderResponse } from '../../types/order';
import { getOrderStatus } from '../../services/order.service';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: '已收到訂單',
  PREPARING: '製作中',
  READY: '已完成，請取餐',
  DELIVERED: '已送達',
  CANCELLED: '已取消',
  QUEUED: '排隊中',
};

export default function TrackOrderPage() {
  const [ref, setRef] = useState('');
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!ref.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const result = await getOrderStatus(ref.trim().toUpperCase());
      setOrder(result);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setError('找不到此訂單，請確認訂單編號');
      } else {
        setError('查詢失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page">
      <header className="page-header">
        <h1>查詢訂單</h1>
      </header>

      <div className="search-box">
        <input
          className="ref-input"
          type="text"
          placeholder="輸入訂單編號 (例如 ORD-00001)"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? '查詢中...' : '查詢'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {order && (
        <div className="order-detail">
          <div className={`status-badge status-${order.status.toLowerCase()}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </div>
          <p className="order-ref">訂單編號：{order.referenceNumber}</p>
          <ul className="order-items-list">
            {order.items.map((item, i) => (
              <li key={i} className="order-item-row">
                <span>{item.name}</span>
                <span>×{item.quantity}</span>
                <span>NT$ {item.subtotal}</span>
              </li>
            ))}
          </ul>
          <div className="order-total">合計：NT$ {order.totalAmount}</div>
          {order.customerNote && <p className="order-note">備註：{order.customerNote}</p>}
        </div>
      )}
    </div>
  );
}
