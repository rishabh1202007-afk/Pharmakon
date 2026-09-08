import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  return (
    <button className={`${base} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
