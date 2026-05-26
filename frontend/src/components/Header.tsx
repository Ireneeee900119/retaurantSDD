import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="app-header">
      <span className="app-title">🍵 餐飲系統</span>
      <nav className="app-nav">
        <Link to="/menu" className={pathname === '/menu' ? 'active' : ''}>
          菜單
        </Link>
        <Link to="/track" className={pathname === '/track' ? 'active' : ''}>
          查詢訂單
        </Link>
      </nav>
    </header>
  );
}
