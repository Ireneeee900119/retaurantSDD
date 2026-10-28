import { useState } from 'react';
import axios from 'axios';
import { useCart } from './CartContext';
import { placeOrder } from '../../services/order.service';
import OrderConfirmation from './OrderConfirmation';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ValidationErrorDetail {
  field?: string;
  message?: string;
}

interface ValidationErrorBody {
  error?: string;
  details?: ValidationErrorDetail[];
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    setItemErrors([]);
    try {
      const result = await placeOrder({
        items: items.map((ci) => ({ menuItemId: ci.item.id, quantity: ci.quantity })),
        customerNote: note || undefined,
      });
      setRefNumber(result.referenceNumber);
      clearCart();
    } catch (err) {
      const body = axios.isAxiosError(err)
        ? (err.response?.data as ValidationErrorBody | undefined)
        : undefined;
      const messages = body?.error === 'VALIDATION_ERROR' && Array.isArray(body.details)
        ? body.details
            .map((d) => d?.message)
            .filter((m): m is string => typeof m === 'string' && m.length > 0)
        : [];
      if (messages.length > 0) {
        setItemErrors(messages);
      } else {
        setError('送出失敗，請再試一次');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  if (refNumber) {
    return (
      <div className="drawer-overlay">
        <div className="drawer">
          <button className="close-btn" onClick={() => { setRefNumber(null); onClose(); }}>✕</button>
          <OrderConfirmation referenceNumber={refNumber} />
        </div>
      </div>
    );
  }

  return (
    <div className="drawer-overlay">
      <div className="drawer">
        <div className="drawer-header">
          <h2>購物車</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {items.length === 0 ? (
          <p className="empty-cart">購物車是空的</p>
        ) : (
          <>
            <ul className="cart-items">
              {items.map((ci) => (
                <li key={ci.item.id} className="cart-item">
                  <span className="cart-item-name">{ci.item.name}</span>
                  <div className="qty-controls">
                    <button onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}>－</button>
                    <span>{ci.quantity}</span>
                    <button onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}>＋</button>
                  </div>
                  <span className="cart-item-subtotal">
                    NT$ {(parseFloat(ci.item.price) * ci.quantity).toFixed(0)}
                  </span>
                  <button className="remove-btn" onClick={() => removeItem(ci.item.id)}>✕</button>
                </li>
              ))}
            </ul>

            <div className="cart-total">合計：NT$ {total}</div>

            <textarea
              className="note-input"
              placeholder="備註（例如：少冰、不加糖）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />

            {itemErrors.length > 0 && (
              <div className="item-errors" role="alert">
                <p className="item-errors-title">以下品項目前無供應，請移除後再送出：</p>
                <ul className="item-errors-list">
                  {itemErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '送出中...' : '送出訂單'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
