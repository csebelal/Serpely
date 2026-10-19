import { V2 } from './v2Theme';

// Dual-arc score ring: solid arc = current score, faint arc = ghost (after Priority fixes).
export function GaugeRing({ score, ghost, size = 224 }: { score: number; ghost: number; size?: number }) {
  const r = 110;
  const C = 2 * Math.PI * r;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const solid = ((clamp(score) / 100) * C).toFixed(1);
  const ghostD = ((clamp(ghost) / 100) * C).toFixed(1);
  const cFixed = C.toFixed(1);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox="0 0 260 260" role="img"
        aria-label={`AI Visibility Index ${score} out of 100, up to ${ghost} after Priority fixes`}>
        <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="18" />
        <circle cx="130" cy="130" r={r} fill="none" stroke={V2.greenBright} strokeOpacity="0.35"
          strokeWidth="18" strokeLinecap="round" strokeDasharray={`${ghostD} ${cFixed}`} transform="rotate(-90 130 130)" />
        <circle cx="130" cy="130" r={r} fill="none" stroke={V2.greenBright}
          strokeWidth="18" strokeLinecap="round" strokeDasharray={`${solid} ${cFixed}`} transform="rotate(-90 130 130)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: V2.fontDisplay, fontWeight: 800, fontSize: size * 0.34, lineHeight: 1, letterSpacing: '-0.04em', color: '#FFFFFF' }}>
          {score}
        </span>
        <span style={{ color: V2.faint, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          AI Visibility Index
        </span>
      </div>
    </div>
  );
}
