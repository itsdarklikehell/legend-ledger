import { useState } from 'preact/hooks';
import type { Hero } from '../types';
import { addChronicle } from '../lib/rules';
import { PortraitPicker } from './PortraitPicker';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface IdentityDrawerProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
}

export function IdentityDrawer({ hero, onChange, onClose: commitClose }: IdentityDrawerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const [name, setName] = useState(hero.name);
  const [pronouns, setPronouns] = useState(hero.pronouns);
  const [concept, setConcept] = useState(hero.concept);
  const [portrait, setPortrait] = useState(hero.portrait ?? '');

  const save = () => {
    if (!name.trim()) return;
    onChange(addChronicle({ ...hero, name: name.trim(), pronouns: pronouns.trim(), concept: concept.trim(), portrait: portrait || undefined }, 'Hero details were edited.'));
    onClose();
  };



  return (
    <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside class="sheet-drawer identity-drawer has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="identity-title">
        <header class="drawer-header">
          <div><p class="eyebrow">Hero</p><h2 id="identity-title">Edit details</h2></div>
          <button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div class="drawer-scroll-region">
        <section class="drawer-section compact-edit-section">
          <label><span>Name</span><input value={name} onInput={(event) => setName(event.currentTarget.value)} /></label>
          <label><span>Pronouns</span><input value={pronouns} onInput={(event) => setPronouns(event.currentTarget.value)} /></label>
          <label><span>Concept</span><textarea value={concept} onInput={(event) => setConcept(event.currentTarget.value)} /></label>
          <PortraitPicker value={portrait} onChange={setPortrait} />
        </section>
        </div>
        <footer class="drawer-footer">
          <button type="button" class="button ghost" onClick={onClose}>Cancel</button>
          <button type="button" class="button primary" onClick={save}>Save</button>
        </footer>
      </aside>
    </div>
  );
}
