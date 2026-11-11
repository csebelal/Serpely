import { BackgroundField } from './BackgroundField';

/* ---------------------------------------------------------------------------
   Concept E · "Ambient Corona" — one soft light source breathing above the
   page content (auth screens, legal spiders, quiet sections). Opacity-only
   animation. `breath=false` renders a fully static gradient.
   --------------------------------------------------------------------------- */

export interface AmbientCoronaProps {
  breath?: boolean;
  intensity?: number;
  className?: string;
}

export function AmbientCorona({ breath = true, intensity = 1, className = '' }: AmbientCoronaProps) {
  return (
    <BackgroundField className={className} style={{ opacity: Math.min(Math.max(intensity, 0), 1) }}>
      <div className={breath ? 'bg-corona bg-corona-breath' : 'bg-corona'} />
    </BackgroundField>
  );
}
