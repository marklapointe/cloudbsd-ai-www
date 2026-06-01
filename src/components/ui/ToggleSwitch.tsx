import React from 'react';

export type ToggleSwitchColor = 'blue' | 'emerald' | 'amber';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: ToggleSwitchColor;
}

const colorClasses: Record<ToggleSwitchColor, { enabled: string }> = {
  blue: {
    enabled: 'bg-blue-600 shadow-blue-900/20',
  },
  emerald: {
    enabled: 'bg-emerald-600 shadow-emerald-900/20',
  },
  amber: {
    enabled: 'bg-amber-600 shadow-amber-900/20',
  },
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  color = 'blue',
}) => {
  const { enabled } = colorClasses[color];

  return (
    <div
      className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${
        checked ? enabled : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${
          checked ? 'left-8' : 'left-1'
        }`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      />
    </div>
  );
};
