import { useState } from 'react';
import type { EffectMetadata } from '@motion-graphics/core';
import { copyTextToClipboard } from '../features/catalog/clipboard';
import { loadEffectExport } from '../registry/effects';

type CopyState = 'idle' | 'preparing' | 'copied' | 'failed' | 'unavailable';

export default function CopyEffectButton({ effect }: { effect: EffectMetadata }) {
  const [state, setState] = useState<CopyState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [manualCopyText, setManualCopyText] = useState('');

  const copyEffect = async () => {
    setState('preparing');
    setStatusMessage('');
    setManualCopyText('');

    let effectSource: string | null;
    try {
      effectSource = await loadEffectExport(effect.id);
    } catch (error) {
      setState('unavailable');
      setStatusMessage(
        error instanceof Error
          ? `The generated effect export could not be loaded: ${error.message}`
          : 'The generated effect export could not be loaded.',
      );
      return;
    }

    if (!effectSource?.trim()) {
      setState('unavailable');
      setStatusMessage('The generated effect export is unavailable. Rebuild the effect registry and try again.');
      return;
    }

    setManualCopyText(effectSource);
    try {
      await copyTextToClipboard(effectSource);
      setState('copied');
      setStatusMessage(
        'Effect source copied. Paste it into a compatible Remotion project; it has not been installed or run.',
      );
    } catch (error) {
      setState('failed');
      setStatusMessage(
        error instanceof Error ? error.message : 'Clipboard copy failed. Select the source below and copy it manually.',
      );
    }
  };

  const label = {
    idle: 'Copy Effect',
    preparing: 'Preparing…',
    copied: 'Copied',
    failed: 'Copy failed',
    unavailable: 'Export unavailable',
  }[state];

  return (
    <div className='effect-copy-action'>
      <button
        type='button'
        className='primary-button'
        onClick={() => void copyEffect()}
        disabled={state === 'preparing'}
      >
        {label}
      </button>
      <p
        className={state === 'failed' || state === 'unavailable' ? 'field-error' : 'copy-status'}
        role={state === 'failed' || state === 'unavailable' ? 'alert' : 'status'}
      >
        {statusMessage}
      </p>
      {manualCopyText && state === 'failed' && (
        <label className='manual-copy-field'>
          <span>Standalone effect source (select and copy manually)</span>
          <textarea
            className='control effect-export-text'
            readOnly
            value={manualCopyText}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
