import { useEffect, useState } from 'react';
import clsx from 'clsx';

type Props = {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  photoUrl?: string;
};

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function Avatar({
  name,
  color = 'bg-ink-800',
  size = 'md',
  ring = false,
  photoUrl,
}: Props) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [photoUrl]);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const showImage = Boolean(photoUrl) && !broken;

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center overflow-hidden rounded-full font-semibold shrink-0',
        showImage ? 'bg-ink-100 dark:bg-ink-800' : clsx('text-white', color),
        sizeMap[size],
        ring && 'ring-2 ring-white dark:ring-ink-900',
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        initials || '?'
      )}
    </div>
  );
}
