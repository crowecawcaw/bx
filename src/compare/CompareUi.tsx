import { abbreviate, lookup } from '../data/verses';
import { siteHref, type SiteId } from '../site';
import { useStore } from '../store';
import { useCompare, type Focus } from './state';

const FOCI: [Focus, string][] = [
  ['all', 'All four'],
  ['tabernacle', 'Tabernacle'],
  ['solomon', 'Solomon’s'],
  ['second', 'Second'],
  ['ezekiel', 'Ezekiel’s'],
];

type Cell = string | [string, string]; // text, or [text, reference]

/** Side-by-side facts, in cubits. A reference makes the cell's verse one tap away. */
export const ROWS: [string, Cell, Cell, Cell, Cell][] = [
  ['Built', ['At Sinai, the second year after the Exodus', 'Exodus 40:17'], ['Seven years, by Solomon', '1 Kings 6:37-38'], ['Finished under Darius; rebuilt by Herod over 46 years', 'John 2:20'], ['Seen in a vision in the exile; never built', 'Ezekiel 40:1-2']],
  ['The house', ['A tent 30 × 10 × 10 within', 'Exodus 26:15-25'], ['60 × 20 × 30, porch 20 × 10, chambers round about', '1 Kings 6:2-5'], '100 × 100 × 100; 70 broad behind the porch (Middot 4:6-7)', ['100 long, 50 broad with its side chambers, on a foundation 6 high', 'Ezekiel 41:8-13']],
  ['Holy Place', '20 × 10 × 10', ['40 × 20 × 30', '1 Kings 6:17'], '40 × 20 × 40 (Middot 4:6-7)', ['40 × 20; height not given', 'Ezekiel 41:2']],
  ['Most Holy Place', '10 × 10 × 10', ['20 × 20 × 20', '1 Kings 6:20'], '20 × 20 × 40 (Middot 4:7)', ['20 × 20; height not given', 'Ezekiel 41:4']],
  ['Between them', ['The veil, with cherubim', 'Exodus 26:31-33'], ['Doors of olive wood and the veil', '2 Chronicles 3:14'], ['Two curtains a cubit apart; rent in twain', 'Matthew 27:51'], ['Two doors of folding leaves; no veil named', 'Ezekiel 41:23-24']],
  ['In the Most Holy Place', ['The ark and mercy seat', 'Exodus 26:34'], ['The ark under two cherubim of 10 cubits', '1 Kings 6:23-28'], ['Empty: a bare rock where the ark had been', 'Hebrews 9:4'], ['Nothing named: the glory of the LORD filled the house', 'Ezekiel 43:5']],
  ['Lampstands · tables', ['1 · 1', 'Exodus 26:35'], ['10 · 10', '2 Chronicles 4:7-8'], ['1 · 1', 'Hebrews 9:2'], ['None named; an altar of wood, “the table that is before the LORD”', 'Ezekiel 41:22']],
  ['Altar', ['5 × 5 × 3, of acacia and brass', 'Exodus 27:1'], ['20 × 20 × 10, of brass', '2 Chronicles 4:1'], ['32 square, 10 high, of unhewn stone', 'Exodus 20:25'], ['18 square at the foot, hearth 12 square, 11 high; stairs on the east', 'Ezekiel 43:13-17']],
  ['For washing', ['The laver', 'Exodus 30:18'], ['The molten sea and ten lavers', '2 Chronicles 4:2-6'], 'A laver with twelve spigots (Middot 3:6)', ['No laver named; a river from under the threshold', 'Ezekiel 47:1']],
  ['Courts', ['100 × 50, of linen hangings', 'Exodus 27:9-18'], 'Inner and great courts, not measured (shown 200 × 100 and 380 × 220)', '500 square mount; courts 187 × 135 and 135 × 135 (Middot 2:1, 5; 5:1)', ['Inner court 100 square; a wall 500 square', 'Ezekiel 42:20']],
];

function CellView({ c }: { c: Cell }) {
  const show = useStore((s) => s.showScripture);
  if (typeof c === 'string') return <>{c}</>;
  return (
    <>
      {c[0]}{' '}
      <button className="ref" onClick={() => show(c[1])}>
        {abbreviate(c[1])}
      </button>
    </>
  );
}

const WALK: [SiteId, string][] = [
  ['tabernacle', 'Walk through the tabernacle ›'],
  ['temple', 'Walk through Solomon’s Temple ›'],
  ['second', 'Walk through the second temple ›'],
  ['ezekiel', 'Walk through Ezekiel’s temple ›'],
];

function Facts() {
  const showFacts = useCompare((s) => s.showFacts);
  return (
    <aside className="sheet tall cmp-facts" role="dialog" aria-label="Compared">
      <header>
        <h2>Side by side</h2>
        <button className="close" onClick={() => showFacts(false)} aria-label="Close">
          ×
        </button>
      </header>
      <div className="sheet-body">
        <p className="summary">
          Measurements are in cubits, and the four are drawn at one scale. Scripture measures the tabernacle, Solomon’s
          house and Ezekiel’s; for Herod’s house the model follows the Mishnah (Middot) and Josephus. Ezekiel’s cubit
          is a handbreadth longer than the common one (Ezek 40:5), so at true size his temple would be about a sixth
          larger than it is drawn.
        </p>
        <div className="cmp-scroll">
        <table className="cmp-table">
          <thead>
            <tr>
              <th />
              <th>Tabernacle</th>
              <th>Solomon’s Temple</th>
              <th>Second Temple</th>
              <th>Ezekiel’s Temple</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, ...cells]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {cells.map((c, i) => (
                  <td key={i}>
                    <CellView c={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {WALK.map(([id, label]) => (
          <p key={id}>
            <a className="switch" href={siteHref(id)}>
              {label}
            </a>
          </p>
        ))}
      </div>
    </aside>
  );
}

/** The Scripture panel, for references tapped in the table. */
function Passage() {
  const panel = useStore((s) => s.panel);
  const query = useStore((s) => s.scriptureQuery);
  const openPanel = useStore((s) => s.openPanel);
  if (panel !== 'scripture') return null;
  return <ScriptureSheet query={query} close={() => openPanel(null)} />;
}


function ScriptureSheet({ query, close }: { query: string; close: () => void }) {
  const r = lookup(query);
  return (
    <aside className="sheet cmp-passage" role="dialog" aria-label="Scripture">
      <header>
        <h2>Scripture</h2>
        <button className="close" onClick={close} aria-label="Close">
          ×
        </button>
      </header>
      <div className="sheet-body">
        {'error' in r ? (
          <p className="error">{r.error}</p>
        ) : (
          <article className="passage">
            <h3>{r.ref} (KJV)</h3>
            {r.verses.map((v) => (
              <p key={v.ref}>
                <sup>{v.ref.split(':')[1]}</sup> {v.text}
              </p>
            ))}
          </article>
        )}
      </div>
    </aside>
  );
}

export function CompareUi() {
  const { focus, setFocus, orbit, toggleOrbit, housesOnly, toggleHouses, facts, showFacts } = useCompare();
  return (
    <div className="ui">
      <div className="topbar">
        <div className="title">
          <div className="region">Side by side</div>
          <div className="progress">One cubit to one cubit · drag to turn, pinch to zoom</div>
        </div>
        <nav className="actions">
          <button onClick={toggleOrbit} className={orbit ? 'on' : ''} aria-label="Fly around">
            <span aria-hidden>⟳</span>
            <span className="lbl">Fly around</span>
          </button>
          <button onClick={toggleHouses} className={housesOnly ? 'on' : ''} aria-label="Houses only">
            <span aria-hidden>🏛</span>
            <span className="lbl">Houses only</span>
          </button>
          <button onClick={() => showFacts(!facts)} className={facts ? 'on' : ''} aria-label="Compare the measurements">
            <span aria-hidden>📐</span>
            <span className="lbl">Facts</span>
          </button>
        </nav>
      </div>
      <nav className="cmp-focus" aria-label="Fly to">
        {FOCI.map(([id, label]) => (
          <button key={id} className={focus === id ? 'on' : ''} onClick={() => setFocus(id)}>
            {label}
          </button>
        ))}
      </nav>
      {facts && <Facts />}
      <Passage />
    </div>
  );
}
