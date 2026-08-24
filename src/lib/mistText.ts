export type MistTokenVariant = 'tag' | 'weakness' | 'status' | 'limit';

export type MistTextToken =
  | { type: 'text'; value: string }
  | { type: 'token'; variant: MistTokenVariant; name: string; value?: string };

const weaknessPattern = /^\{!([^{}]+)\}/;
const limitPattern = /^\{([^{}]*?):(\d*|~|-)\}/;
const statusPattern = /^\{([^{}]*?)-(\d*)\}/;
const tagPattern = /^\{([^{}]+)\}/;

export function parseMistText(source: string): MistTextToken[] {
  const text = source ?? '';
  const tokens: MistTextToken[] = [];
  let cursor = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const previous = tokens[tokens.length - 1];
    if (previous?.type === 'text') previous.value += value;
    else tokens.push({ type: 'text', value });
  };

  while (cursor < text.length) {
    const nextBrace = text.indexOf('{', cursor);
    if (nextBrace < 0) {
      pushText(text.slice(cursor));
      break;
    }

    pushText(text.slice(cursor, nextBrace));
    const remaining = text.slice(nextBrace);

    let match = weaknessPattern.exec(remaining);
    if (match) {
      tokens.push({ type: 'token', variant: 'weakness', name: match[1]!.trim() });
      cursor = nextBrace + match[0].length;
      continue;
    }

    match = limitPattern.exec(remaining);
    if (match) {
      tokens.push({
        type: 'token',
        variant: 'limit',
        name: match[1]!.trim(),
        value: match[2]! === '-' ? '~' : match[2]!,
      });
      cursor = nextBrace + match[0].length;
      continue;
    }

    match = statusPattern.exec(remaining);
    if (match) {
      tokens.push({
        type: 'token',
        variant: 'status',
        name: match[1]!.trim(),
        value: match[2]!,
      });
      cursor = nextBrace + match[0].length;
      continue;
    }

    match = tagPattern.exec(remaining);
    if (match) {
      tokens.push({ type: 'token', variant: 'tag', name: match[1]!.trim() });
      cursor = nextBrace + match[0].length;
      continue;
    }

    pushText('{');
    cursor = nextBrace + 1;
  }

  return tokens;
}
