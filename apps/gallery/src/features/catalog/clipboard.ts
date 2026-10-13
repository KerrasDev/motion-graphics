export interface TextClipboard {
  writeText(text: string): Promise<void>;
}

export async function copyTextToClipboard(
  text: string,
  clipboard: TextClipboard | undefined = typeof navigator === 'undefined' ? undefined : navigator.clipboard,
): Promise<void> {
  if (!text.trim()) {
    throw new Error('There is no effect content to copy.');
  }
  if (!clipboard) {
    throw new Error('Clipboard access is unavailable. Select the content below and copy it manually.');
  }

  await clipboard.writeText(text);
}
