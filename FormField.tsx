import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, error, helpText, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="label">
        {label}
        {required && <span className="text-error-600"> *</span>}
      </label>
      {children}
      {helpText && !error && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...props }: TextInputProps) {
  return (
    <input
      className={cn('input', invalid && 'border-error-400 focus:border-error-500 focus:ring-error-500', className)}
      {...props}
    />
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid, className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn('input min-h-[80px] resize-y', invalid && 'border-error-400', className)}
      {...props}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  children: ReactNode;
}

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn('input cursor-pointer', invalid && 'border-error-400', className)}
      {...props}
    >
      {children}
    </select>
  );
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        {...props}
      />
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    </label>
  );
}
