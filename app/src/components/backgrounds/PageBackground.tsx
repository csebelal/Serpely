import type { CSSProperties } from 'react';
import { BackgroundField } from './BackgroundField';
import { AmbientCorona } from './AmbientCorona';
import { AuroraDrift } from './AuroraDrift';
import { DataStream } from './DataStream';
import { IntelligentGrid } from './IntelligentGrid';
import { NeuralMesh } from './NeuralMesh';
import { ShaderAurora } from './ShaderAurora';

/* Page-level convenience dispatcher — one line per page:
   <PageBackground variant="hero" /> placed as the first child of the page's
   `relative` hero section. Content wrappers with `relative z-10` always stack
   above every variant. */

export type PageBackgroundVariant =
  /** Homepage signature: WebGL aurora-flow shader (falls back to the CSS
      aurora where WebGL is unavailable) */
  | 'hero'
  /** Previous hero combo: Crawlfield sweep × CSS aurora */
  | 'hero-css'
  /** Two drifting light fields (secondary page hero bands) */
  | 'aurora'
  /** Static wash retained + soft drifting fields, tuned low (matches the
      original `radial-gradient(ellipse 80% 50% at 50% …)` washes) */
  | 'aurora-wash'
  /** Single breathing light source (auth screens, quiet pages) */
  | 'corona'
  /** Analytical grid sweep, low intensity (dashboard) */
  | 'grid'
  /** Neural mesh field (AI feature surfaces) */
  | 'mesh'
  | 'mesh-high'
  /** Index stream flowing down the field (technical SEO / audit) */
  | 'flow'
  | 'flow-up';

export interface PageBackgroundProps {
  variant: PageBackgroundVariant;
  className?: string;
  /** 0..1 opacity multiplier */
  intensity?: number;
  /** pointer interactivity pass-through for mesh variants */
  interactive?: boolean;
}

export function PageBackground({
  variant,
  className = '',
  intensity = 1,
  interactive = false,
}: PageBackgroundProps) {
  switch (variant) {
    case 'hero':
      return <ShaderAurora className={className} intensity={intensity} />;
    case 'hero-css':
      return (
        <>
          <IntelligentGrid className={className} />
          <AuroraDrift className={className} intensity={0.85 * intensity} />
        </>
      );
    case 'aurora':
      return <AuroraDrift className={className} intensity={intensity} />;
    case 'aurora-wash': {
      const style: CSSProperties = {
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, var(--bg-anim-corona) 0%, transparent 70%)',
        opacity: Math.min(Math.max(intensity, 0), 1),
      };
      return (
        <BackgroundField className={className}>
          <div className="bg-wash" style={style} />
          <AuroraDrift intensity={0.7 * intensity} orbs={1} />
        </BackgroundField>
      );
    }
    case 'corona':
      return <AmbientCorona className={className} intensity={intensity} />;
    case 'grid':
      return <IntelligentGrid className={className} intensity={0.45 * intensity} duration={22} />;
    case 'mesh':
      return <NeuralMesh className={className} density="low" interactive={interactive} />;
    case 'mesh-high':
      return <NeuralMesh className={className} density="high" interactive />;
    case 'flow':
      return <DataStream className={className} direction="down" />;
    case 'flow-up':
      return <DataStream className={className} direction="up" />;
  }
}
