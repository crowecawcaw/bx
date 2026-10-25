import { useState } from 'react';
import { Scene } from './scene/Scene';
import { Ui } from './ui/Ui';

export function App() {
  const [entered, setEntered] = useState(false);
  return (
    <>
      <Scene />
      <Ui />
      {!entered && (
        <div className="intro" onClick={() => setEntered(true)}>
          <div className="intro-card">
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
          </div>
        </div>
      )}
    </>
  );
}
