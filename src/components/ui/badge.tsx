import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-blue-100 text-blue-800 border-transparent',
    secondary: 'bg-gray-100 text-gray-800 border-transparent',
    destructive: 'bg-red-100 text-red-800 border-transparent',
    success: 'bg-green-100 text-green-800 border-transparent',
    warning: 'bg-amber-100 text-amber-800 border-transparent',
    outline: 'border border-gray-300 text-gray-800',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${
        variants[variant] || variants.default
      } ${className}`}
      {...props}
    />
  );
}
