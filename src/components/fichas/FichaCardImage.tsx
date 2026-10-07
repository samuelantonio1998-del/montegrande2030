import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Converte URL pública do Storage para o endpoint de transformação (render/image). */
export function toThumbUrl(url: string, width = 400, quality = 70, version?: string | number) {
  let out = url;
  if (url.includes('/storage/v1/object/public/')) {
    out = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const sep = out.includes('?') ? '&' : '?';
    out = `${out}${sep}width=${width}&quality=${quality}&resize=cover`;
  }
  if (version !== undefined) out += `${out.includes('?') ? '&' : '?'}v=${version}`;
  return out;
}

export function FichaCardImage({ src, alt, version }: { src: string; alt: string; version?: string | number }) {
  const [loaded, setLoaded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const url = fallback
    ? `${src}${version !== undefined ? `${src.includes('?') ? '&' : '?'}v=${version}` : ''}`
    : toThumbUrl(src, 400, 70, version);
  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
      <img
        src={url}
        alt={alt}
        width={400}
        height={225}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => { if (!fallback) setFallback(true); }}
        className={cn('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </>
  );
}
