'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

export interface DropdownOption {
  label: string;
  value: string;
  icon?: ReactNode;
}

export interface DropdownProps {
  label?: string; // Prefix text like "Status:" or "Genre:"
  options: DropdownOption[];
  value?: string; // Selected value, if controlling externally
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string; // Additional classes for the wrapper
}

export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = ''
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || options[0]?.value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative group w-full sm:w-auto ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-4 w-full sm:w-auto px-4 py-2 bg-primary/5 rounded-lg text-sm hover:bg-primary/10 transition-all border border-primary/10 text-slate-900 dark:text-slate-100"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && (
            <span className="flex items-center justify-center shrink-0 w-4 h-4">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">
            {label && <span className="text-slate-500 font-medium">{label}: </span>}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <span 
          className={`material-symbols-outlined text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* Menú flotante estilo select - Usa absolute y z-index para no alterar el contenedor */}
      <div 
        className={`absolute top-full left-0 mt-2 w-min min-w-full sm:min-w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/50 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        <ul className="max-h-60 overflow-y-auto p-1">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  currentValue === opt.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                {opt.icon && (
                  <span className="flex items-center justify-center shrink-0 w-4 h-4">
                    {opt.icon}
                  </span>
                )}
                <span className="truncate">{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}