import { Outlet } from 'react-router-dom';

export default function AdminShell() {
  return (
    <div className="admin-shell">
      <Outlet />
    </div>
  );
}
