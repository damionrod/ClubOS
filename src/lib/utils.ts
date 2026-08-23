export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | null | undefined, format?: string): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  if (format === 'short') {
    return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number | null | undefined, currency = 'NZD'): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

export function fullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  preferredName?: string | null,
): string {
  if (preferredName) return `${preferredName} ${lastName ?? ''}`.trim();
  return `${firstName ?? ''} ${lastName ?? ''}`.trim();
}
