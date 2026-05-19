import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { InvitationPublic, User } from '../lib/types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [invite, setInvite] = useState<InvitationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<InvitationPublic>(`/api/invitations/${token}`)
      .then(setInvite)
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setInvalid(true); })
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api<{ user: User }>(`/api/invitations/${token}/accept`, {
        method: 'POST', body: JSON.stringify(form),
      });
      await refresh();
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not accept invitation');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (invalid || !invite) return (
    <div className="mx-auto max-w-md mt-16 bg-white p-8 rounded-lg shadow-sm border">
      <h1 className="text-xl font-semibold">Invitation invalid or expired</h1>
      <p className="text-gray-600 mt-2">Please ask your admin for a new invite link.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-md mt-16 bg-white p-8 rounded-lg shadow-sm border">
      <h1 className="text-2xl font-semibold mb-2">Join {invite.orgName}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Invited as <strong>{invite.email}</strong> with role <strong>{invite.role}</strong>.
        {invite.teams.length > 0 && <> Initial teams: {invite.teams.map((t) => t.name).join(', ')}.</>}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Choose a password (min 8 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Accepting…' : 'Accept invitation'}</Button>
      </form>
    </div>
  );
}
