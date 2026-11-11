import type { CSSProperties, ReactNode } from 'react';

/* Base container for every ambient field: clipped to its positioned parent,
   never intercepts input, and never sits above page content (drop it in as
   the first child of a `relative` section; content wrappers that follow are
   `relative z-10`). */
export function BackgroundField({
  children,
  className = '',
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div aria-hidden="true" className={`bg-field ${className}`} style={style}>
      {children}
    </div>
  );
}
