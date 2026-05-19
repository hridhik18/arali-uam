import type { InputHTMLAttributes } from 'react';

export function Input({
  label, error, className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none ${className}`}
        {...rest}
      />
      {error && <span className="block text-sm text-red-600 mt-1">{error}</span>}
    </label>
  );
}
