import { BackgroundField } from './BackgroundField';
import type { CSSProperties } from 'react';

/* ---------------------------------------------------------------------------
   Concept C · "Aurora Drift" — two large, pre-blurred light fields (brand
   green + product teal) drifting on slow alternate loops. transform-only
   animation, falling radial gradients instead of filter: blur(), so each orb
   composites on the GPU for nearly nothing. Clamps hold page-specific
   intensity without stacking multiple fields.
   --------------------------------------------------------------------------- */

export interface AuroraDriftProps {
  /** 0..1 opacity multiplier */
  intensity?: number;
  orbs?: 1 | 2;
  className?: string;
}

export function AuroraDrift({ intensity = 1, orbs = 2, className = '' }: AuroraDriftProps) {
  const style: CSSProperties = { opacity: Math.min(Math.max(intensity, 0), 1) };
  return (
    <BackgroundField className={className} style={style}>
      <div className="bg-orb bg-orb-1" />
      {orbs === 2 && <div className="bg-orb bg-orb-2" />}
    </BackgroundField>
  );
}
