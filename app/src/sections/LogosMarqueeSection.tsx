import { useEffect, useState } from 'react';
import { getSection } from '@/lib/api';

export function LogosMarqueeSection() {
  const [label, setLabel] = useState('Integrated with tools your team already uses');

  useEffect(() => {
    getSection('logos-marquee').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.label === 'string') setLabel(d.label);
    }).catch(() => {});
  }, []);

  const logos = [
    { name: 'Google Search Console', img: 'processed-logos/ribbon-gsc.png',        minWidth: 240, imgH: 44 },
    { name: 'GA4',                   img: 'processed-logos/ribbon-ga4.png',         minWidth: 170, imgH: 44 },
    { name: 'DataForSEO',            img: 'processed-logos/ribbon-dataforseo.png',  minWidth: 190, imgH: 54 },
    { name: 'OpenAI',                img: 'processed-logos/ribbon-openai.png',      minWidth: 190, imgH: 44 },
    { name: 'Semrush',               img: 'processed-logos/ribbon-semrush.png',     minWidth: 240, imgH: 44 },
    { name: 'Ahrefs',                img: 'processed-logos/ribbon-ahrefs.png',      minWidth: 190, imgH: 44 },
    { name: 'Perplexity',            img: 'processed-logos/ribbon-perplexity.png',  minWidth: 190, imgH: 44 },
    { name: 'WordPress',             img: 'processed-logos/ribbon-wordpress.png',   minWidth: 190, imgH: 44 },
    { name: 'Anthropic',             img: 'processed-logos/ribbon-anthropic.png',   minWidth: 240, imgH: 44 },
    { name: 'Webflow',               img: 'processed-logos/ribbon-webflow.png',     minWidth: 240, imgH: 44 },
  ];

  const doubled = [...logos, ...logos];

  return (
    <section className="py-10 px-6 border-y relative" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="max-w-6xl mx-auto">
        <p className="text-[12px] font-bold uppercase text-center mb-5" style={{ color: 'var(--text-faint)', letterSpacing: '0.16em' }}>
          {label}
        </p>
        <div className="overflow-hidden marquee-mask">
          <div className="flex w-max animate-marquee items-center" style={{ gap: '52px' }}>
            {doubled.map((logo, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{ height: 56, minWidth: logo.minWidth }}
              >
                <img
                  src={logo.img}
                  alt={logo.name}
                  style={{ height: logo.imgH, maxWidth: 220, width: 'auto', objectFit: 'contain', filter: 'var(--logo-filter)' }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
