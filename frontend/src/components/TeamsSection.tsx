import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Button } from './Button';
import { Input } from './Input';
import type { Team } from '../lib/types';

export function TeamsSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api<{ teams: Team[] }>('/api/teams');
    setTeams(r.teams);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/api/teams', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create team');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Teams</h2>
      <form onSubmit={create} className="flex gap-2 mb-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" />
        <Button type="submit" disabled={busy || !name.trim()}>Create team</Button>
      </form>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : teams.length === 0 ? (
        <p className="text-sm text-gray-500">No teams yet.</p>
      ) : (
        <ul className="space-y-3">
          {teams.map((t) => (
            <li key={t.id} className="border rounded p-3">
              <div className="font-medium">{t.name} <span className="text-gray-500 text-sm">({t.memberCount} members)</span></div>
              <div className="text-sm text-gray-600 mt-1">
                {t.members.length === 0 ? 'No members yet' :
                  t.members.map((m) => m.name + (m.isManager ? ' (manager)' : '')).join(', ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
