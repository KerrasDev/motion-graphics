import { useState } from 'react';

type CodeBlockProps = {
  code: string;
  copyButtonLabel?: string;
};

export default function CodeBlock({ code, copyButtonLabel = 'Copy' }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const field = document.createElement('textarea');
        field.value = code;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard copy was not successful.');
      }
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-toolbar">
        <span>TSX</span>
        <button type="button" className="code-copy-button" onClick={copy}>
          {copyState === 'copied' ? 'Copied' : copyButtonLabel}
        </button>
      </div>
      <pre className="code-block"><code>{code}</code></pre>
      <span className="copy-status" aria-live="polite">
        {copyState === 'copied' ? 'Content copied to clipboard.' : copyState === 'failed' ? 'Copy failed. Select and copy the content manually.' : ''}
      </span>
    </div>
  );
}
