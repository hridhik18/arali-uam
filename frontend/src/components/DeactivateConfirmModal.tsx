import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Modal } from './Modal';
import { Button } from './Button';
import type { User } from '../lib/types';

export function DeactivateConfirmModal({ open, user, onClose, onConfirmed }: {
  open: boolean; user: User | null; onClose: () => void; onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function go() {
    setBusy(true); setError(null);
    try {
      await api(`/api/users/${user!.id}/deactivate`, { method: 'POST' });
      onConfirmed();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not deactivate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Deactivate ${user.name}?`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">This user will no longer be able to log in.</p>
        {user.accountsOwned.length > 0 && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3">
            They currently own <strong>{user.accountsOwned.length}</strong> account(s):{' '}
            {user.accountsOwned.map((a) => a.name).join(', ')}.<br />
            These ownerships remain in the historical record but no new accounts can be assigned to this user.
          </div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={go} disabled={busy}>{busy ? 'Deactivating…' : 'Deactivate'}</Button>
        </div>
      </div>
    </Modal>
  );
}
