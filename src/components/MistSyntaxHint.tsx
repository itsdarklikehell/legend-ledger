import { MistText } from './MistText';

export function MistSyntaxHint() {
  return (
    <details class="mist-syntax-hint">
      <summary>Inline game text</summary>
      <p>You can include tags and statuses directly in game text. On the live sheet, rendered tags and statuses are tappable: tags become scene tags and statuses are added or stacked immediately.</p>
      <div class="mist-syntax-examples">
        <span><code>{'{tag}'}</code><MistText text="{keen senses}" /></span>
        <span><code>{'{!weakness}'}</code><MistText text="{!reckless}" /></span>
        <span><code>{'{status-2}'}</code><MistText text="{wounded-2}" /></span>
        <span><code>{'{limit:3}'}</code><MistText text="{wounded:3}" /></span>
      </div>
    </details>
  );
}
