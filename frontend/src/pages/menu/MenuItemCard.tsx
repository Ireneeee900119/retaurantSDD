import type { MenuItem } from '../../types/menu';
import { useCart } from '../order/CartContext';

interface Props {
  item: MenuItem;
}

export default function MenuItemCard({ item }: Props) {
  const { addItem } = useCart();

  return (
    <div className={`menu-item-card ${!item.isAvailable ? 'unavailable' : ''}`}>
      {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="item-image" />}
      <div className="item-info">
        <h3 className="item-name">{item.name}</h3>
        {item.description && <p className="item-desc">{item.description}</p>}
        <div className="item-footer">
          <span className="item-price">NT$ {item.price}</span>
          {item.isAvailable ? (
            <button className="add-btn" onClick={() => addItem(item)}>
              加入訂單
            </button>
          ) : (
            <span className="unavailable-badge">目前無供應</span>
          )}
        </div>
      </div>
    </div>
  );
}
