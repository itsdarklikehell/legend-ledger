import { APP_NAME } from '../app-meta';
import { OtherToolsMenu, type ToolLink } from './OtherToolsMenu';

const TABLETOP_TOOLS: readonly ToolLink[] = [
  {
    id: 'malice-menagerie',
    name: 'Malice Menagerie',
    description: 'Draw Steel · GM tool',
    href: 'https://malice-menagerie.pages.dev/',
    external: true,
  },
  {
    id: 'red-ops',
    name: 'RED//OPS',
    description: 'Cyberpunk RED · GM tool',
    href: 'https://red-ops.pages.dev/',
    external: true,
  },
  {
    id: 'daggerheart-obsidian',
    name: 'Daggerheart Toolkit',
    description: 'Daggerheart · Obsidian plugin',
    href: 'https://github.com/Eppinguin/obsidian-daggerheart-toolkit',
    external: true,
  },
];

export function AppFooter() {
  return (
    <footer class="sheet-footer" aria-label="About and related tools">
      <div class="sheet-footer__identity">
        <span class="sheet-footer__rune" aria-hidden="true">L</span>
        <span>
          <strong>{APP_NAME}</strong>
          <small>Unofficial fan-made companion</small>
        </span>
      </div>
      <div class="sheet-footer__actions">
        <a href="#top" class="sheet-footer__link">Back to top</a>
        <span class="sheet-footer__divider" aria-hidden="true">◇</span>
        <OtherToolsMenu tools={TABLETOP_TOOLS} currentId="legend-ledger" placement="top-end" />
      </div>
    </footer>
  );
}
