import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary', className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition';
  const styles: Record<Variant, string> = {
    primary: 'bg-gray-900 text-white hover:bg-gray-700',
    secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}
