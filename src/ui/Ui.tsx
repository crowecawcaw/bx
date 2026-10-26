import { useEffect, useMemo, useRef, useState } from 'react';
import { type Requirement } from '../data/specs';
import { AVAILABLE, abbreviate, lookup } from '../data/verses';
import { COURT, POS, TENT } from '../scene/dims';
import { siteHref } from '../site';
import { SITE } from '../sites';
import { useStore } from '../store';
import { tapToWalk, usePlayerDot } from './mapCommon';
import { TempleMap } from './TempleMap';

const FEATURES = SITE.features;
const GENERAL = SITE.general;
const TEMPLE = SITE.id === 'temple';

const LAYER_NAMES = ['Bare frame', 'Linen with cherubim', "+ Goats' hair", "+ Rams' skins", '+ Tachash skins (all)'];

function RefLink({ r }: { r: string }) {
  const show = useStore((s) => s.showScripture);
  return (
    <button className="ref" onClick={() => show(r)}>
      {abbreviate(r)}
    </button>
  );
}

function ReqList({ items }: { items: Requirement[] }) {
  return (
    <ul className="reqs">
      {items.map((r, i) => (
        <li key={i}>
          <span className="check" aria-hidden>
            ✓
          </span>
          <span className="req-text">{r.text}</span> <RefLink r={r.ref} />
        </li>
      ))}
    </ul>
  );
}

function InfoPanel() {
  const id = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const f = FEATURES.find((x) => x.id === id);
  if (!f) return null;
  return (
    <aside className="sheet" role="dialog" aria-label={f.name}>
      <header>
        <div>
          <h2>{f.name}</h2>
          {f.hebrew && <div className="hebrew">{f.hebrew}</div>}
        </div>
        <button className="close" onClick={() => select(null)} aria-label="Close">
          ×
        </button>
      </header>
      <div className="sheet-body">
        <p className="summary">{f.summary}</p>
        <h3>What Scripture requires</h3>
        <ReqList items={f.requirements} />
        {f.interpretation && (
          <>
            <h3>Where Scripture is silent</h3>
            <ul className="notes">
              {f.interpretation.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </>
        )}
        <h3>Read the passage</h3>
        <div className="refs">
          {f.refs.map((r) => (
            <RefLink key={r} r={r} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function SpecsPanel() {
  const total = FEATURES.reduce((n, f) => n + f.requirements.length, GENERAL.length);
  const select = useStore((s) => s.select);
  const openPanel = useStore((s) => s.openPanel);
  return (
    <>
      <p className="summary">
        {SITE.specsIntro} <b>{total}</b> requirements are modeled.
      </p>
      <h3>General</h3>
      <ReqList items={GENERAL} />
      {FEATURES.map((f) => (
        <section key={f.id}>
          <h3>
            <button
              className="link"
              onClick={() => {
                openPanel(null);
                select(f.id);
              }}
            >
              {f.name} ›
            </button>
          </h3>
          <ReqList items={f.requirements} />
        </section>
      ))}
    </>
  );
}

function ScripturePanel() {
  const query = useStore((s) => s.scriptureQuery);
  const [text, setText] = useState(query);
  useEffect(() => setText(query), [query]);
  const result = useMemo(() => lookup(query), [query]);
  const show = useStore((s) => s.showScripture);
  return (
    <>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          show(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={TEMPLE ? 'e.g. 1 Kings 6:23-28' : 'e.g. Exodus 26:31-33'}
          aria-label="Bible reference"
          enterKeyHint="search"
        />
        <button type="submit">Look up</button>
      </form>
      {'error' in result ? (
        <p className="error">{result.error}</p>
      ) : (
        <article className="passage">
          <h3>{result.ref} (KJV)</h3>
          {result.verses.map((v) => (
            <p key={v.ref}>
              <sup>{v.ref.split(':')[1]}</sup> {v.text}
            </p>
          ))}
        </article>
      )}
      <h3>Chapters included</h3>
      <div className="refs">
        {AVAILABLE.flatMap((b) =>
          b.chapters.map((c) => (
            <button key={`${b.book}${c}`} className="ref" onClick={() => show(`${b.book} ${c}`)}>
              {abbreviate(`${b.book} ${c}`)}
            </button>
          )),
        )}
      </div>
    </>
  );
}

function Help() {
  return (
    <div className="help">
      <p>
        <b>Tap</b> the ground to walk there. <b>Drag</b> to look around. On a keyboard, use <b>WASD</b> or the arrow keys.
      </p>
      {TEMPLE ? (
        <p>
          <b>Tap a door</b> when you are close to open or close it: the gate of the inner court, the doors of the temple,
          the doors of the oracle, and the veil.
        </p>
      ) : (
        <p>
          <b>Tap a curtain</b> when you are close to draw it aside or close it: the gate, the door of the tent, and the veil.
        </p>
      )}
      <p>
        <b>Info bubbles</b> appear near key objects. Tap one for the scriptural requirements and the verses.
      </p>
      <p>
        {!TEMPLE && (
          <>
            <b>Layers</b> peels back the four coverings of the tent.{' '}
          </>
        )}
        <b>Map</b>: tap a spot to walk there.
      </p>
      <p className="fine">
        Measurements are in cubits (about 18 in / 46 cm). Scripture text is the King James Version (public domain).
        Where Scripture gives no detail, each info panel says what the model assumes.
      </p>
      <p>
        <a className="switch" href={siteHref(TEMPLE ? 'tabernacle' : 'temple')}>
          {TEMPLE ? 'Visit the tabernacle ›' : "Visit Solomon's Temple ›"}
        </a>
      </p>
    </div>
  );
}

function SidePanel() {
  const panel = useStore((s) => s.panel);
  const openPanel = useStore((s) => s.openPanel);
  if (!panel) return null;
  const title = { specs: 'Requirements', scripture: 'Scripture', help: 'How to explore' }[panel];
  return (
    <aside className="sheet tall" role="dialog" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button className="close" onClick={() => openPanel(null)} aria-label="Close">
          ×
        </button>
      </header>
      <div className="sheet-body">
        {panel === 'specs' && <SpecsPanel />}
        {panel === 'scripture' && <ScripturePanel />}
        {panel === 'help' && <Help />}
      </div>
    </aside>
  );
}

/** Top-down plan of the tabernacle; tap to walk. */
function TabernacleMap() {
  const dot = usePlayerDot();
  const open = useStore((s) => s.open);
  const { minX, minZ, length, width, gateWidth } = COURT;
  const vb = `${minX - 18} ${minZ - 12} ${length + 36} ${width + 24}`;
  return (
    <svg
      className="minimap"
      viewBox={vb}
      onClick={tapToWalk}
      aria-label="Map: tap to walk"
    >
      <rect x={minX} y={minZ} width={length} height={width} className="mm-court" />
      <line x1={-minX} y1={-gateWidth / 2} x2={-minX} y2={gateWidth / 2} className={open.gate ? 'mm-gate open' : 'mm-gate'} />
      <rect x={TENT.backX - 1} y={-6} width={31} height={12} className="mm-tent" />
      <line x1={TENT.veilX} y1={-5} x2={TENT.veilX} y2={5} className={open.veil ? 'mm-veil open' : 'mm-veil'} />
      <rect x={POS.altar[0] - 2.5} y={-2.5} width={5} height={5} className="mm-bronze" />
      <circle cx={POS.laver[0]} cy={0} r={1.4} className="mm-bronze" />
      <rect x={POS.ark[0] - 1.25} y={-0.75} width={2.5} height={1.5} className="mm-gold" />
      <rect x={POS.table[0] - 1} y={POS.table[1] - 0.5} width={2} height={1} className="mm-gold" />
      <circle cx={POS.menorah[0]} cy={POS.menorah[1]} r={0.9} className="mm-gold" />
      <rect x={POS.incense[0] - 0.5} y={-0.5} width={1} height={1} className="mm-gold" />
      <text x={56} y={2} className="mm-label">
        E
      </text>
      <g ref={dot}>
        <path d="M0,-4.2 L2.8,3 L0,1.6 L-2.8,3 Z" className="mm-player" />
      </g>
    </svg>
  );
}

export function Ui() {
  const region = useStore((s) => s.region);
  const layers = useStore((s) => s.layers);
  const cycleLayers = useStore((s) => s.cycleLayers);
  const openPanel = useStore((s) => s.openPanel);
  const discovered = useStore((s) => s.discovered);
  const [map, setMap] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setToast(LAYER_NAMES[layers]);
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [layers]);
  return (
    <div className="ui">
      <div className="topbar">
        <div className="title">
          <div className="region">{SITE.regionLabel[region]}</div>
          <div className="progress">
            {discovered.length}/{FEATURES.length} explored
          </div>
        </div>
        <nav className="actions">
          <button onClick={() => openPanel('scripture')} aria-label="Scripture">
            <span aria-hidden>📜</span>
            <span className="lbl">Scripture</span>
          </button>
          <button onClick={() => openPanel('specs')} aria-label="Requirements">
            <span aria-hidden>📐</span>
            <span className="lbl">Specs</span>
          </button>
          {SITE.layers && (
            <button onClick={cycleLayers} aria-label="Coverings">
              <span aria-hidden>🧵</span>
              <span className="lbl">Layers {layers}/4</span>
            </button>
          )}
          <button onClick={() => setMap((m) => !m)} aria-label="Map" className={map ? 'on' : ''}>
            <span aria-hidden>🗺️</span>
            <span className="lbl">Map</span>
          </button>
          <button onClick={() => openPanel('help')} aria-label="Help">
            <span aria-hidden>?</span>
          </button>
        </nav>
      </div>
      {map && (TEMPLE ? <TempleMap /> : <TabernacleMap />)}
      {toast && <div className="toast">{toast}</div>}
      <InfoPanel />
      <SidePanel />
    </div>
  );
}
