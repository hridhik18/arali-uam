import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from './Button';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-full">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <Link to="/" className="font-semibold">Arali</Link>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <>
                <Link to="/me" className="text-gray-600 hover:text-gray-900">
                  {user.name} ({user.role})
                </Link>
                <Button variant="secondary" onClick={async () => { await logout(); navigate('/login'); }}>
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
