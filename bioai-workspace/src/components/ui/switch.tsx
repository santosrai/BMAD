import React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ 
    checked, 
    onCheckedChange, 
    disabled = false, 
    className,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        id={id}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          // Base styles
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          // Background color based on state
          checked 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-300 hover:bg-gray-400',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed hover:bg-gray-300',
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="sr-only">Toggle switch</span>
        <span
          className={cn(
            // Base thumb styles
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
            // Position based on state
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';