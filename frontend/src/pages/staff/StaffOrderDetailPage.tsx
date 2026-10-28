import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { OrderStatus, StaffOrderDetail } from '../../types/staff';
import {
  getStaffOrder,
  updateStaffOrderStatus,
} from '../../services/staff.service';
import {
  STATUS_LABELS,
  TRANSITION_LABELS,
  VALID_TRANSITIONS,
  formatDateTime,
} from './statusConfig';
import './staff.css';

export default function StaffOrderDetailPage() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StaffOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (referenceNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStaffOrder(referenceNumber);
      setOrder(data);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setError('找不到此訂單');
      } else {
        setError('載入訂單失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ref) return;
    load(ref);
  }, [ref, load]);

  const handleTransition = async (next: OrderStatus) => {
    if (!ref || !order) return;
    const confirmMsg =
      next === 'CANCELLED'
        ? `確定要取消訂單 ${ref} 嗎？`
        : null;
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setUpdating(next);
    setActionError(null);
    try {
      await updateStaffOrderStatus(ref, next);
      await load(ref);
    } catch (e: any) {
      const code = e?.response?.data?.error;
      if (code === 'INVALID_STATUS_TRANSITION') {
        setActionError('訂單狀態已變更，請重新整理後再試');
      } else {
        setActionError('更新狀態失敗，請稍後再試');
      }
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="center">載入中...</div>;
  if (error) {
    return (
      <div className="staff-page">
        <button
          type="button"
          className="staff-detail-back"
          onClick={() => navigate('/staff')}
        >
          ← 返回訂單列表
        </button>
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!order) return null;

  const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];

  return (
    <div className="staff-page">
      <button
        type="button"
        className="staff-detail-back"
        onClick={() => navigate('/staff')}
      >
        ← 返回訂單列表
      </button>

      <header className="page-header">
        <h1>訂單詳情</h1>
      </header>

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

        {order.customerNote && (
          <p className="order-note">備註：{order.customerNote}</p>
        )}

        <div className="staff-detail-timestamps">
          <span>建立時間：{formatDateTime(order.createdAt)}</span>
          <span>最後更新：{formatDateTime(order.updatedAt)}</span>
        </div>

        {actionError && <p className="error">{actionError}</p>}

        {nextStatuses.length > 0 && (
          <div className="staff-detail-actions">
            {nextStatuses.map((next) => (
              <button
                key={next}
                type="button"
                className={`staff-action-btn ${next === 'CANCELLED' ? 'danger' : ''}`}
                disabled={updating !== null}
                onClick={() => handleTransition(next)}
              >
                {updating === next ? '更新中...' : TRANSITION_LABELS[next]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
