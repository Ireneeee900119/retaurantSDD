import { Outlet } from 'react-router-dom';

export default function StaffShell() {
  return (
    <div className="staff-shell">
      <Outlet />
    </div>
  );
}
