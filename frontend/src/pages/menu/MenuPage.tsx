import { useEffect, useState } from 'react';
import type { MenuCategory } from '../../types/menu';
import { getMenu } from '../../services/menu.service';
import MenuItemCard from './MenuItemCard';
import CartDrawer from '../order/CartDrawer';

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    getMenu()
      .then(setCategories)
      .catch(() => setError('無法載入菜單，請稍後再試'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="center">載入中...</div>;
  if (error) return <div className="center error">{error}</div>;

  return (
    <div className="menu-page">
      <header className="page-header">
        <h1>菜單</h1>
        <button className="cart-btn" onClick={() => setCartOpen(true)}>
          購物車
        </button>
      </header>

      {categories.map((cat) => (
        <section key={cat.id} className="category-section">
          <h2 className="category-name">{cat.name}</h2>
          <div className="items-grid">
            {cat.items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
