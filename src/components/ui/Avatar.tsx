import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

interface AvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ firstName, lastName, photoUrl, size = 'md', className }: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName ?? ''} ${lastName ?? ''}`}
        className={cn('rounded-full object-cover', sizeStyles[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700',
        sizeStyles[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
