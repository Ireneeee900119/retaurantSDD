import { useEffect, useState } from 'react';
import type { AdminMenuCategory } from '../../types/admin';
import {
  getAdminCategories,
  toggleCategoryActive,
  toggleItemAvailability,
} from '../../services/admin.service';
import './AvailabilityDashboard.css';

type PendingKey = string;

export default function AvailabilityDashboard() {
  const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<PendingKey>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminCategories();
        if (!cancelled) setCategories(data);
      } catch (e) {
        if (!cancelled) setError('載入失敗，請稍後再試');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markPending = (key: PendingKey, on: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleCategoryToggle = async (categoryId: string, nextActive: boolean) => {
    const key = `cat:${categoryId}`;
    markPending(key, true);
    try {
      const res = await toggleCategoryActive(categoryId, nextActive);
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, isActive: res.isActive } : c)),
      );
    } catch {
      setError('更新分類狀態失敗');
    } finally {
      markPending(key, false);
    }
  };

  const handleItemToggle = async (
    categoryId: string,
    itemId: string,
    nextAvailable: boolean,
  ) => {
    const key = `item:${itemId}`;
    markPending(key, true);
    try {
      const res = await toggleItemAvailability(itemId, nextAvailable);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                items: c.items.map((it) =>
                  it.id === itemId ? { ...it, isAvailable: res.isAvailable } : it,
                ),
              }
            : c,
        ),
      );
    } catch {
      setError('更新餐點狀態失敗');
    } finally {
      markPending(key, false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>供應管理</h1>
        <p className="admin-subtitle">管理分類與餐點的供應狀態</p>
      </header>

      {error && (
        <p className="error" onClick={() => setError(null)}>
          {error}（點擊關閉）
        </p>
      )}

      {categories.length === 0 && <p>尚無分類資料。</p>}

      <div className="admin-categories">
        {categories.map((cat) => {
          const catKey = `cat:${cat.id}`;
          const catPending = pending.has(catKey);
          return (
            <section
              key={cat.id}
              className={`admin-category ${cat.isActive ? '' : 'is-inactive'}`}
            >
              <div className="admin-category-header">
                <div>
                  <h2 className="admin-category-name">{cat.name}</h2>
                  <span className="admin-category-status">
                    {cat.isActive ? '供應中' : '已停售'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`toggle-btn ${cat.isActive ? 'toggle-on' : 'toggle-off'}`}
                  disabled={catPending}
                  onClick={() => handleCategoryToggle(cat.id, !cat.isActive)}
                >
                  {catPending ? '更新中...' : cat.isActive ? '停售整個分類' : '恢復供應'}
                </button>
              </div>

              <ul className="admin-item-list">
                {cat.items.length === 0 && (
                  <li className="admin-item-empty">此分類暫無餐點</li>
                )}
                {cat.items.map((item) => {
                  const itemKey = `item:${item.id}`;
                  const itemPending = pending.has(itemKey);
                  return (
                    <li key={item.id} className="admin-item-row">
                      <div className="admin-item-info">
                        <span className="admin-item-name">{item.name}</span>
                        <span className="admin-item-price">NT$ {item.price}</span>
                        <span
                          className={`admin-item-badge ${
                            item.isAvailable ? 'badge-on' : 'badge-off'
                          }`}
                        >
                          {item.isAvailable ? '供應中' : '已售完'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`toggle-btn small ${
                          item.isAvailable ? 'toggle-on' : 'toggle-off'
                        }`}
                        disabled={itemPending}
                        onClick={() =>
                          handleItemToggle(cat.id, item.id, !item.isAvailable)
                        }
                      >
                        {itemPending
                          ? '更新中...'
                          : item.isAvailable
                            ? '標示售完'
                            : '恢復供應'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
