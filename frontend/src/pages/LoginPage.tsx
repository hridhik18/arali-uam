import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md mt-16 bg-white p-8 rounded-lg shadow-sm border">
      <h1 className="text-2xl font-semibold mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Log in'}</Button>
      </form>
      <p className="text-sm text-gray-600 mt-4">No account? <Link to="/signup" className="underline">Sign up</Link></p>
    </div>
  );
}
