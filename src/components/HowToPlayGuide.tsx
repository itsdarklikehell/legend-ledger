import { ConsequenceIcon, ScratchIcon } from './Icons';

function OutcomeMark({ kind }: { kind: 'success' | 'mixed' | 'consequence' }) {
  if (kind === 'consequence') return <ConsequenceIcon className="guide-consequence-icon" />;
  return <span class={`guide-outcome-diamond is-${kind}`} aria-hidden="true"><span /></span>;
}

export function HowToPlayGuide() {
  return (
    <section class="reference-card dark-reference litm-how-to-guide" aria-label="How to play reference">
      <div class="guide-column guide-taking-actions">
        <div class="guide-heading-row"><h2 id="how-to-play-title">How to Play</h2></div>
        <h3>Taking Actions</h3>
        <p class="guide-intro">When you get the spotlight, describe what you do. If the Narrator calls for a roll, count Power and roll. Detailed outcomes can then spend Power on Effects.</p>

        <div class="guide-step"><strong>1</strong><span>Describe your action</span></div>
        <div class="guide-step"><strong>2</strong><span>Make a roll</span></div>

        <div class="guide-power-box">
          <span>Count your action’s <b>Power</b></span>
          <ul>
            <li><b>+1</b> for every helpful tag</li>
            <li><b>−1</b> for every hindering tag</li>
            <li><b>+ tier</b> of the highest helpful status</li>
            <li><b>− tier</b> of the highest hindering status</li>
          </ul>
        </div>

        <div class="guide-outcomes">
          <div><OutcomeMark kind="success" /><span><b>10+</b> Success</span></div>
          <div><OutcomeMark kind="mixed" /><span><b>7–9</b> Success + Consequences</span></div>
          <div><OutcomeMark kind="consequence" /><span><b>6−</b> Consequences</span></div>
        </div>

        <div class="guide-step"><strong>3</strong><span>Spend your Power</span></div>
        <ul class="guide-effect-list">
          <li><b>Status</b> · 1 Power per tier</li>
          <li><b>Tag</b> · 2 Power</li>
          <li><b>Discover</b> · 1 Power</li>
          <li><b>Extra feat</b> · 1 Power</li>
        </ul>
      </div>

      <div class="guide-column guide-side-reference">
        <section>
          <h3>Reactions</h3>
          <p>When Consequences would give or remove a tag/status, the Narrator may allow a reaction. Invoke only relevant reactive tags and statuses, then roll.</p>
          <div class="guide-reaction-results">
            <span><b>10+</b> Spend Power +1 on any Effect</span>
            <span><b>7–9</b> Spend Power only to lessen</span>
            <span><b>6−</b> Take the Consequences as-is</span>
          </div>
        </section>

        <section class="guide-development">
          <h3>Hero Development</h3>
          <div><span class="guide-track-pips"><i /><i /><i /></span><b>Improve</b><p>Usually mark when a weakness is invoked negatively. When full, take an Improvement.</p></div>
          <div><span class="guide-track-pips"><i /><i /><i /></span><b>Abandon</b><p>Usually mark when you ignore or betray the Quest. When full, the theme can be replaced.</p></div>
          <div><span class="guide-track-pips"><i /><i /><i /></span><b>Milestone</b><p>Usually mark when you achieve a Quest milestone. When full, the theme can evolve.</p></div>
        </section>

        <section class="guide-sheet-gestures">
          <h3>On this sheet</h3>
          <p><span class="guide-diamond-mini">◇</span> tap a tag or status for its default use. Shift/Alt-click, right-click, or press-and-hold to invoke the opposite way.</p>
          <p><ScratchIcon className="guide-scratch-icon" /> scratch is separate from selecting a tag.</p>
        </section>
      </div>
    </section>
  );
}
