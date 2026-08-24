import { useState } from 'preact/hooks';

interface PortraitPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const MAX_PORTRAIT_BYTES = 2_000_000;

export function PortraitPicker({ value, onChange, label = 'Portrait' }: PortraitPickerProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const loadPortrait = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > MAX_PORTRAIT_BYTES) {
      setError('Choose an image under 2 MB.');
      return;
    }

    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.addEventListener('load', () => onChange(typeof reader.result === 'string' ? reader.result : ''));
    reader.readAsDataURL(file);
  };

  return (
    <div class="portrait-picker">
      <label class="portrait-upload">
        <span>{label}</span>
        <span class="portrait-file-control">
          <span class="portrait-file-button">{value ? 'Replace image' : 'Choose image'}</span>
          <span class="portrait-file-name">{fileName || (value ? 'Portrait selected' : 'No portrait selected')}</span>
          <input class="sr-only" type="file" accept="image/*" onChange={(event) => loadPortrait(event.currentTarget.files?.[0])} />
        </span>
      </label>
      {error && <small class="portrait-file-error" role="alert">{error}</small>}
      {value && <div class="portrait-preview" style={{ backgroundImage: `url(${value})` }}><button type="button" onClick={() => { onChange(''); setFileName(''); setError(''); }}>Remove portrait</button></div>}
    </div>
  );
}
