import { AppShell } from '../components/AppShell';
import { useAuth } from '../auth/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Basics</h2>
          <dl className="text-sm grid grid-cols-3 gap-y-2">
            <dt className="text-gray-500">Name</dt><dd className="col-span-2">{user.name}</dd>
            <dt className="text-gray-500">Email</dt><dd className="col-span-2">{user.email}</dd>
            <dt className="text-gray-500">Role</dt><dd className="col-span-2">{user.role}</dd>
            <dt className="text-gray-500">Status</dt><dd className="col-span-2">{user.deactivatedAt ? 'Deactivated' : 'Active'}</dd>
          </dl>
        </section>

        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">My teams</h2>
          {user.teams.length === 0 ? <p className="text-sm text-gray-500">You're not on any teams.</p> : (
            <ul className="text-sm space-y-1">
              {user.teams.map((t) => (
                <li key={t.id}>{t.name}{t.isManager && <span className="ml-2 text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">manager</span>}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">My customer accounts</h2>
          {user.accountsOwned.length === 0 ? <p className="text-sm text-gray-500">You don't own any accounts.</p> : (
            <ul className="text-sm space-y-1">
              {user.accountsOwned.map((a) => <li key={a.id}>{a.name}</li>)}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
