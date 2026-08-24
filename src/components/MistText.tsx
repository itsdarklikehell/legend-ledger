import { Fragment } from 'preact';
import { parseMistText } from '../lib/mistText';
import { WeaknessMarkIcon } from './Icons';

interface MistTextProps {
  text: string;
  className?: string;
  onAddTag?: (name: string) => void;
  onAddStatus?: (name: string, tier: number) => void;
}

export function MistText({ text, className = '', onAddTag, onAddStatus }: MistTextProps) {
  const tokens = parseMistText(text);

  return (
    <span class={`mist-rich-text ${className}`.trim()}>
      {tokens.map((token, index) => {
        if (token.type === 'text') return <Fragment key={`text-${index}`}>{token.value}</Fragment>;

        if (token.variant === 'weakness') {
          return (
            <span class="mist-inline-token mist-weakness" data-tag-name={token.name} key={`weakness-${index}`} title={`Weakness · {!${token.name}}`}>
              <WeaknessMarkIcon className="mist-inline-weakness-icon" />
              <span>{token.name}</span>
            </span>
          );
        }

        if (token.variant === 'status') {
          const label = token.value === '' ? token.name : `${token.name}-${token.value}`;
          const tier = Math.max(1, Number.parseInt(token.value ?? '', 10) || 1);
          if (onAddStatus) {
            return (
              <button
                type="button"
                class="mist-inline-token mist-status is-actionable"
                data-status-name={token.name}
                data-status-value={token.value ?? ''}
                key={`status-${index}`}
                title={`Add / stack ${label} on this Hero`}
                aria-label={`Add or stack status ${label}`}
                onClick={(event) => { event.stopPropagation(); onAddStatus(token.name, tier); }}
              >
                {label}
              </button>
            );
          }
          return (
            <span class="mist-inline-token mist-status" data-status-name={token.name} data-status-value={token.value ?? ''} key={`status-${index}`} title={`Status · {${token.name}-${token.value ?? ''}}`}>
              {label}
            </span>
          );
        }

        if (token.variant === 'limit') {
          return (
            <span class="mist-inline-token mist-limit" data-limit-name={token.name} data-limit-value={token.value ?? ''} data-limit-immune={token.value === '~' ? 'true' : 'false'} key={`limit-${index}`} title={`Limit · {${token.name}:${token.value === '~' ? '~' : token.value ?? ''}}`}>
              <span>{token.name}</span>
              {token.value !== '' && <span class="mist-limit-shield" aria-hidden="true">{token.value === '~' ? '–' : token.value}</span>}
            </span>
          );
        }

        if (onAddTag) {
          return (
            <button
              type="button"
              class="mist-inline-token mist-tag is-actionable"
              data-tag-name={token.name}
              key={`tag-${index}`}
              title={`Add ${token.name} as a scene story tag`}
              aria-label={`Add story tag ${token.name} to the scene`}
              onClick={(event) => { event.stopPropagation(); onAddTag(token.name); }}
            >
              {token.name}
            </button>
          );
        }

        return (
          <span class="mist-inline-token mist-tag" data-tag-name={token.name} key={`tag-${index}`} title={`Tag · {${token.name}}`}>
            {token.name}
          </span>
        );
      })}
    </span>
  );
}
