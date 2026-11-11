import { BackgroundField } from './BackgroundField';

/* ---------------------------------------------------------------------------
   Concept A · "Crawlfield" — the site's existing 64/256px grid, awakened.
   A faint light band sweeps the grid top→bottom like a crawler pass, with a
   1px signal line on its leading edge. Pure CSS (transform + opacity only),
   so it is GPU-composited and costs no JS while running. Reuses the global
   body grid; `grid` renders a local copy only where the field sits on a dark
   panel that draws its own background.
   --------------------------------------------------------------------------- */

export interface IntelligentGridProps {
  /** animate the sweep (still respects reduced motion via CSS) */
  sweep?: boolean;
  /** render a local grid copy (for fields inside dark panels) */
  grid?: boolean;
  /** seconds for one sweep pass */
  duration?: number;
  /** 0..1 opacity of the sweep band */
  intensity?: number;
  className?: string;
}

export function IntelligentGrid({
  sweep = true,
  grid = false,
  duration = 14,
  intensity = 1,
  className = '',
}: IntelligentGridProps) {
  return (
    <BackgroundField className={className}>
      {grid && (
        <>
          <div className="bg-grid-layer" />
          <div className="bg-grid-layer bg-grid-layer-strong" />
        </>
      )}
      {sweep && (
        <div
          className="bg-grid-sweep"
          style={{ animationDuration: `${duration}s`, opacity: intensity }}
        >
          <div className="bg-grid-sweep-line" />
        </div>
      )}
    </BackgroundField>
  );
}
