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
  buttonClassName?: string; // Additional classes for the button itself
  menuClassName?: string; // Additional classes for the dropdown menu
  ariaLabel?: string;
  disabled?: boolean;
}

export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  ariaLabel,
  disabled = false
}: Readonly<DropdownProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || options[0]?.value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentValue = value ?? internalValue;
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

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    if (onChange) onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative group w-full sm:w-auto ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${buttonClassName}`}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && (
            <span className="flex items-center justify-center shrink-0 w-4 h-4">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">
            {label && <span className="font-medium text-muted-foreground">{label}: </span>}
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
      {isOpen && <div
        className={`absolute left-0 top-full z-[100] mt-2 w-min min-w-full overflow-hidden rounded-xl border border-border bg-popover text-foreground shadow-2xl transition-all duration-200 sm:min-w-48 ${menuClassName} ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'}`}
      >
        <ul className="max-h-60 overflow-y-auto p-1">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(opt.value)}
                className={`flex cursor-pointer items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors disabled:cursor-not-allowed ${
                  currentValue === opt.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-muted'
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
      </div>}
    </div>
  );
}
