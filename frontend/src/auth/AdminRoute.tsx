import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AdminRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== 'org_admin') {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Not authorized</h1>
        <p className="text-gray-600 mt-2">This area is for organization admins.</p>
      </div>
    );
  }
  return <Outlet />;
}
