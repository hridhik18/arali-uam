import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">404 — not found</h1>
      <Link to="/" className="text-blue-600 underline">Go home</Link>
    </div>
  );
}
