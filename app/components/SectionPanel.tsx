'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

import { SECTION_BY_ID, type SectionItem } from '@/app/data/sections';

/**
 * Glass menu panel — balmingtiger `.menu-panel` pattern:
 * left-docked frosted glass, thumb rows + CTA pills, music nested detail.
 */
export default function SectionPanel({
  activeId,
  onClose,
}: {
  activeId: string | null;
  onClose: () => void;
}) {
  const [shownId, setShownId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SectionItem | null>(null);
  const level1 = useRef<HTMLDivElement>(null);
  const level2 = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);

    if (activeId) {
      setShownId(activeId);
      setDetail(null);
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }

    setOpen(false);
    setDetail(null);
    closeTimer.current = setTimeout(() => setShownId(null), 420);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) setDetail(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, detail, onClose]);

  // Nested music detail fade (balmingtiger openSingleAlbum 0.4s power1.inOut)
  useEffect(() => {
    const a = level1.current;
    const b = level2.current;
    if (!a) return;
    if (detail) {
      gsap.to(a, { opacity: 0, duration: 0.35, ease: 'power1.inOut', overwrite: true });
      if (b) {
        gsap.fromTo(
          b,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power1.inOut', overwrite: true },
        );
      }
    } else {
      gsap.to(a, { opacity: 1, duration: 0.35, ease: 'power1.inOut', overwrite: true });
      if (b) gsap.set(b, { opacity: 0 });
    }
  }, [detail]);

  const section = shownId ? SECTION_BY_ID[shownId] : null;
  const isMusic = section?.id === 'listening-booth';

  const handleBack = () => {
    if (detail) {
      setDetail(null);
      return;
    }
    onClose();
  };

  const openItem = (item: SectionItem) => {
    if (isMusic && item.tracks?.length) {
      setDetail(item);
      return;
    }
    if (item.href && item.href !== '#play' && item.href !== '#shop') {
      window.open(item.href, item.href.startsWith('mailto:') ? '_self' : '_blank');
    }
  };

  return (
    <div
      className={`panel-root ${open ? 'open' : ''}`}
      style={{ display: section ? 'block' : 'none' }}
      aria-hidden={!open}
    >
      <div className="panel-scrim" onPointerDown={onClose} />
      <aside
        className={`panel${isMusic && detail ? ' has-detail' : ''}`}
        style={
          section
            ? ({ ['--panel-accent' as string]: section.accent } as React.CSSProperties)
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={section?.title}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          className="panel-back"
          onClick={handleBack}
          aria-label={detail ? 'Back' : 'Close'}
          data-cursor="click"
        >
          {detail ? 'BACK' : '×'}
        </button>

        {section && (
          <>
            <div className="panel-level panel-level-1" ref={level1}>
              <p className="panel-kicker">{section.kicker}</p>
              <h2 className="panel-title">{section.title}</h2>
              <p className="panel-intro">{section.intro}</p>

              <div className="panel-list">
                {section.items.map((it, i) => (
                  <article
                    key={i}
                    className="panel-row"
                    data-cursor="click"
                    onClick={() => openItem(it)}
                  >
                    <div
                      className="panel-thumb"
                      style={{ background: `color-mix(in srgb, ${section.accent} 55%, #1a1410)` }}
                      aria-hidden
                    >
                      <span>{it.thumb ?? String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="panel-row-body">
                      <span className="pc-label">{it.label}</span>
                      {it.meta && <span className="pc-meta">{it.meta}</span>}
                      {it.detail && <span className="pc-detail">{it.detail}</span>}
                      <div className="panel-cta-wrap">
                        {(it.cta || (isMusic && it.tracks)) && (
                          <span className="panel-cta">{it.cta ?? 'Open'}</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {detail && (
              <div className="panel-level panel-level-2" ref={level2}>
                <p className="panel-kicker">{section.kicker}</p>
                <h2 className="panel-title panel-title-sm">{detail.label}</h2>
                {detail.meta && <p className="panel-intro">{detail.meta}{detail.detail ? ` · ${detail.detail}` : ''}</p>}

                <ul className="panel-tracks">
                  {(detail.tracks ?? []).map((t, i) => (
                    <li key={i}>
                      <span>{t.title}</span>
                      {t.duration && <span className="track-dur">{t.duration}</span>}
                    </li>
                  ))}
                </ul>

                {detail.listenOn && detail.listenOn.length > 0 && (
                  <div className="panel-listen">
                    <span className="streaming-title">LISTEN ON:</span>
                    <div className="panel-cta-wrap">
                      {detail.listenOn.map((l) => (
                        <a
                          key={l.label}
                          className="panel-cta panel-cta-pill"
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          data-cursor="click"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
