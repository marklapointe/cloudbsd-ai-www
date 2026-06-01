import React from 'react';

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg">
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</h3>
      </div>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 cursor-pointer ${
            disabled ? 'opacity-50 cursor-wait' : ''
          }`}
          aria-label={label}
          title={label}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 group-hover:text-brand-500 transition-colors">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};
