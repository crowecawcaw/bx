import { useState } from 'react';
import { CompareUi } from './compare/CompareUi';
import { Scene } from './scene/Scene';
import { SITE_ID, siteHref, type SiteId } from './site';
import { Ui } from './ui/Ui';

const TABS: [SiteId, string][] = [
  ['tabernacle', 'Tabernacle'],
  ['temple', 'Solomon’s Temple'],
  ['second', 'Second Temple'],
  ['sea', 'Red Sea'],
  ['compare', 'Side by side'],
];

function Tabs() {
  return (
    <nav className="tabs" aria-label="Choose an experience">
      {TABS.map(([id, name]) =>
        id === SITE_ID ? (
          <span key={id}>{name}</span>
        ) : (
          <a key={id} href={siteHref(id)}>
            {name}
          </a>
        ),
      )}
    </nav>
  );
}

function TabernacleIntro() {
  return (
    <>
      <h1>The Tabernacle</h1>
      <p className="verse">
        “And let them make me a sanctuary; that I may dwell among them.”
        <br />
        <span>Exodus 25:8</span>
      </p>
      <p>
        Walk through the court, the Holy Place and the Most Holy Place. Everything is built to the measurements in
        Exodus 25–40.
      </p>
      <ul>
        <li>Tap the ground to walk · drag to look</li>
        <li>Tap curtains to draw them aside</li>
        <li>Tap the info bubbles for verses and details</li>
      </ul>
      <button className="primary">Enter the camp</button>
    </>
  );
}

function TempleIntro() {
  return (
    <>
      <h1>Solomon’s Temple</h1>
      <p className="verse">
        “I have surely built thee an house to dwell in, a settled place for thee to abide in for ever.”
        <br />
        <span>1 Kings 8:13</span>
      </p>
      <p>
        Walk through the courts, the porch between Jachin and Boaz, the Holy Place and the oracle. Everything is built to
        the measurements in 1 Kings 6–7 and 2 Chronicles 3–4.
      </p>
      <ul>
        <li>Tap the ground to walk · drag to look</li>
        <li>Tap doors and the veil to open them</li>
        <li>Tap the info bubbles for verses and details</li>
      </ul>
      <button className="primary">Enter the courts</button>
    </>
  );
}

function SecondIntro() {
  return (
    <>
      <h1>The Second Temple</h1>
      <p className="verse">
        “The glory of this latter house shall be greater than of the former, saith the LORD of hosts.”
        <br />
        <span>Haggai 2:9</span>
      </p>
      <p>
        Walk the temple Jesus knew: Solomon’s Porch and the Court of the Gentiles, past the soreg into the Court of the
        Women, up the fifteen steps to the altar, and into the Holy Place. Built to the measurements of the Mishnah.
      </p>
      <ul>
        <li>Tap the ground to walk · drag to look</li>
        <li>Tap the gate, the doors and the veil to open them</li>
        <li>Tap the info bubbles for verses and details</li>
      </ul>
      <button className="primary">Enter the temple mount</button>
    </>
  );
}

function CompareIntro() {
  return (
    <>
      <h1>Side by side</h1>
      <p className="verse">
        “Who is left among you that saw this house in her first glory? and how do ye see it now?”
        <br />
        <span>Haggai 2:3</span>
      </p>
      <p>
        The tabernacle, Solomon’s Temple and the second temple at the same scale, facing east with their Most Holy
        Places in a line. The camera flies around them.
      </p>
      <ul>
        <li>Drag to turn · pinch or scroll to zoom · two fingers to pan</li>
        <li>Tap a name to fly to it; “Houses only” sets the houses together</li>
        <li>“Facts” compares their measurements, with the verses</li>
      </ul>
      <button className="primary">Fly around</button>
    </>
  );
}

function SeaIntro() {
  return (
    <>
      <h1>The Red Sea</h1>
      <p className="verse">
        “And the children of Israel went into the midst of the sea upon the dry ground: and the waters were a wall
        unto them on their right hand, and on their left.”
        <br />
        <span>Exodus 14:22</span>
      </p>
      <p>
        Walk the seabed with the multitude, between walls of standing water, toward the dawn on the far shore. The pillar
        of cloud stands behind you.
      </p>
      <ul>
        <li>Tap the seabed to walk · drag to look</li>
        <li>Double-tap to jump there</li>
        <li>Tap the info bubbles for verses and details</li>
      </ul>
      <button className="primary">Step onto the seabed</button>
    </>
  );
}

const INTRO = { tabernacle: TabernacleIntro, temple: TempleIntro, second: SecondIntro, sea: SeaIntro, compare: CompareIntro }[SITE_ID];

export function App() {
  const [entered, setEntered] = useState(false);
  return (
    <>
      <Scene />
      {SITE_ID === 'compare' ? <CompareUi /> : <Ui />}
      {!entered && (
        <div className="intro" onClick={() => setEntered(true)}>
          <div className="intro-card">
            <div onClick={(e) => e.stopPropagation()}>
              <Tabs />
            </div>
            <INTRO />
          </div>
        </div>
      )}
    </>
  );
}
