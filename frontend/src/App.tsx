import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './pages/order/CartContext';
import Header from './components/Header';
import MenuPage from './pages/menu/MenuPage';
import TrackOrderPage from './pages/track/TrackOrderPage';
import StaffShell from './pages/staff/StaffShell';
import StaffPlaceholder from './pages/staff/StaffPlaceholder';
import AdminShell from './pages/admin/AdminShell';
import AvailabilityDashboard from './pages/admin/AvailabilityDashboard';
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
            <Route path="/staff" element={<StaffShell />}>
              <Route index element={<StaffPlaceholder />} />
            </Route>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AvailabilityDashboard />} />
            </Route>
          </Routes>
        </main>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
