import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md mt-16 bg-white p-8 rounded-lg shadow-sm border">
      <h1 className="text-2xl font-semibold mb-6">Create your organization</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Organization name" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} required />
        <Input label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password (min 8 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating…' : 'Create organization'}</Button>
      </form>
      <p className="text-sm text-gray-600 mt-4">Already have an account? <Link to="/login" className="underline">Log in</Link></p>
    </div>
  );
}
