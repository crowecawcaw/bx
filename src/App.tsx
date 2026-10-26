import { useState } from 'react';
import { Scene } from './scene/Scene';
import { SITE_ID, siteHref } from './site';
import { Ui } from './ui/Ui';

function Tabs() {
  return (
    <nav className="tabs" aria-label="Choose a sanctuary">
      {SITE_ID === 'tabernacle' ? <span>Tabernacle</span> : <a href={siteHref('tabernacle')}>Tabernacle</a>}
      {SITE_ID === 'temple' ? <span>Solomon’s Temple</span> : <a href={siteHref('temple')}>Solomon’s Temple</a>}
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

export function App() {
  const [entered, setEntered] = useState(false);
  return (
    <>
      <Scene />
      <Ui />
      {!entered && (
        <div className="intro" onClick={() => setEntered(true)}>
          <div className="intro-card">
            <div onClick={(e) => e.stopPropagation()}>
              <Tabs />
            </div>
            {SITE_ID === 'temple' ? <TempleIntro /> : <TabernacleIntro />}
          </div>
        </div>
      )}
    </>
  );
}
