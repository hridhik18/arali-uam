import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import type { Team, Role } from '../lib/types';

export function InviteUserModal({ open, onClose, onInvited }: {
  open: boolean; onClose: () => void; onInvited: () => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(''); setRole('member'); setTeamIds([]); setError(null); setInviteUrl(null);
    api<{ teams: Team[] }>('/api/teams').then((r) => setTeams(r.teams));
  }, [open]);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ invitation: { id: string }; token: string }>('/api/invitations', {
        method: 'POST', body: JSON.stringify({ email, role, teamIds }),
      });
      setInviteUrl(`${window.location.origin}/invite/${r.token}`);
      onInvited();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create invitation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite user">
      {inviteUrl ? (
        <div className="space-y-3">
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            Invitation created. Share this link with the user:
          </div>
          <div className="flex gap-2">
            <input readOnly value={inviteUrl} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy</Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setInviteUrl(null); }}>Invite another</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="member">Member</option>
              <option value="team_manager">Team manager</option>
              <option value="org_admin">Org admin</option>
            </select>
          </label>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Teams</span>
            <div className="space-y-1 max-h-40 overflow-auto border rounded-md p-2">
              {teams.length === 0 && <p className="text-sm text-gray-500">No teams yet</p>}
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={teamIds.includes(t.id)}
                    onChange={(e) => setTeamIds(e.target.checked ? [...teamIds, t.id] : teamIds.filter((id) => id !== t.id))} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !email}>{busy ? 'Creating…' : 'Create invite'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
