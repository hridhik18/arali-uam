import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Modal } from './Modal';
import { Button } from './Button';
import type { Team, Role, User } from '../lib/types';

export function EditUserModal({ open, user, onClose, onSaved }: {
  open: boolean; user: User | null; onClose: () => void; onSaved: () => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [role, setRole] = useState<Role>('member');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    setRole(user.role);
    setTeamIds(user.teams.map((t) => t.id));
    api<{ teams: Team[] }>('/api/teams').then((r) => setTeams(r.teams));
  }, [open, user]);

  if (!user) return null;

  async function submit() {
    setBusy(true); setError(null);
    try {
      await api(`/api/users/${user!.id}`, {
        method: 'PATCH', body: JSON.stringify({ role, teamIds }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${user.name}`}>
      <div className="space-y-4">
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
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  );
}
