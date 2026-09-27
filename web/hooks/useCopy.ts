import { useState } from "react";

// Copies text to the clipboard and flips `copied` to true for a moment.
export function useCopy() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the text is still selectable.
    }
  }

  return { copied, copy };
}
