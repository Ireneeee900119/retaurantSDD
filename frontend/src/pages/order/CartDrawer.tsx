import { useState } from 'react';
import { useCart } from './CartContext';
import { placeOrder } from '../../services/order.service';
import OrderConfirmation from './OrderConfirmation';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await placeOrder({
        idempotencyKey: crypto.randomUUID(),
        items: items.map((ci) => ({ menuItemId: ci.item.id, quantity: ci.quantity })),
        customerNote: note || undefined,
      });
      setRefNumber(result.referenceNumber);
      clearCart();
    } catch {
      setError('送出失敗，請再試一次');
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
