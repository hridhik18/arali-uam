import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Button } from './Button';
import { Input } from './Input';
import type { CustomerAccount, User } from '../lib/types';

export function AccountsSection() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [a, u] = await Promise.all([
      api<{ accounts: CustomerAccount[] }>('/api/customer-accounts'),
      api<{ users: User[] }>('/api/users'),
    ]);
    setAccounts(a.accounts);
    setUsers(u.users);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/api/customer-accounts', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function addOwner(accountId: string, userId: string) {
    if (!userId) return;
    try {
      await api(`/api/customer-accounts/${accountId}/owners`, {
        method: 'POST', body: JSON.stringify({ userId }),
      });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    }
  }

  async function removeOwner(accountId: string, userId: string) {
    await api(`/api/customer-accounts/${accountId}/owners/${userId}`, { method: 'DELETE' });
    load();
  }

  const activeUsers = users.filter((u) => !u.deactivatedAt);

  return (
    <section className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Customer accounts</h2>
      <form onSubmit={create} className="flex gap-2 mb-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New account name" />
        <Button type="submit" disabled={busy || !name.trim()}>Create account</Button>
      </form>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No accounts yet.</p>
      ) : (
        <ul className="space-y-3">
          {accounts.map((acc) => {
            const ownerIds = new Set(acc.owners.map((o) => o.id));
            const pickable = activeUsers.filter((u) => !ownerIds.has(u.id));
            return (
              <li key={acc.id} className="border rounded p-3">
                <div className="font-medium mb-2">{acc.name}</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {acc.owners.length === 0 && <span className="text-sm text-gray-500">No owners</span>}
                  {acc.owners.map((o) => (
                    <span key={o.id} className={`text-xs rounded px-2 py-1 ${o.deactivatedAt ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-800'}`}>
                      {o.name}{o.deactivatedAt && ' (deactivated)'}
                      <button onClick={() => removeOwner(acc.id, o.id)} className="ml-1 text-red-600">✕</button>
                    </span>
                  ))}
                </div>
                <select className="text-sm rounded border border-gray-300 px-2 py-1"
                  defaultValue="" onChange={(e) => { addOwner(acc.id, e.target.value); e.currentTarget.value = ''; }}>
                  <option value="" disabled>Add owner…</option>
                  {pickable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
