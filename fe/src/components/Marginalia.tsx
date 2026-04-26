/**
 * Sticky left-edge rail with line numbers and chapter markers — a manuscript
 * marginalia treatment. Hidden on small screens; on desktop it gives the page
 * a distinctive annotated-page feel.
 */
export function Marginalia() {
  return (
    <aside className="marginalia">
      <div className="line-num major">
        <span className="dot" />
        01
      </div>
      <div className="line-num">
        <span className="dot" />
        02
      </div>
      <div className="line-num">
        <span className="dot" />
        03
      </div>
      <div className="line-num">
        <span className="dot" />
        04
      </div>
      <div className="line-num">
        <span className="dot" />
        05
      </div>

      <div className="chapter">i</div>
      <div className="line-num major">
        <span className="dot" />
        Pulse
      </div>

      <div className="chapter">ii</div>
      <div className="line-num major">
        <span className="dot" />
        Focus
      </div>

      <div className="chapter">iii</div>
      <div className="line-num major">
        <span className="dot" />
        Ledger
      </div>

      <div className="chapter">∞</div>
      <div className="line-num">
        <span className="dot" />
        Colophon
      </div>
    </aside>
  );
}
