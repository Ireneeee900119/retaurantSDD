import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './pages/order/CartContext';
import Header from './components/Header';
import MenuPage from './pages/menu/MenuPage';
import TrackOrderPage from './pages/track/TrackOrderPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/menu" replace />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/track" element={<TrackOrderPage />} />
          </Routes>
        </main>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
