import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  padding?: CardPadding;
  children: React.ReactNode;
  className?: string;
}

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  padding = 'lg',
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
