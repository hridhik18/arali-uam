import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Button } from './Button';
import { InviteUserModal } from './InviteUserModal';
import { EditUserModal } from './EditUserModal';
import { DeactivateConfirmModal } from './DeactivateConfirmModal';
import type { User } from '../lib/types';

export function UsersSection() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    const r = await api<{ users: User[] }>('/api/users');
    setUsers(r.users);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <section className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <Button onClick={() => setShowInvite(true)}>Invite user</Button>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : users.length === 0 ? (
        <p className="text-sm text-gray-500">No users yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600 border-b">
              <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Teams</th><th>Accounts</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.teams.map((t) => t.name).join(', ') || '—'}</td>
                  <td>{u.accountsOwned.map((a) => a.name).join(', ') || '—'}</td>
                  <td>{u.deactivatedAt ? <span className="text-red-600">Deactivated</span> : 'Active'}</td>
                  <td className="whitespace-nowrap">
                    <Button variant="secondary" className="mr-2" onClick={() => setEditing(u)}>Edit</Button>
                    <Button variant="danger"
                      disabled={!!u.deactivatedAt || u.id === me?.id}
                      onClick={() => setDeactivating(u)}>Deactivate</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InviteUserModal open={showInvite} onClose={() => setShowInvite(false)} onInvited={load} />
      <EditUserModal open={!!editing} user={editing} onClose={() => setEditing(null)} onSaved={load} />
      <DeactivateConfirmModal open={!!deactivating} user={deactivating} onClose={() => setDeactivating(null)} onConfirmed={load} />
    </section>
  );
}
