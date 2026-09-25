import { useCopy } from "../hooks/useCopy";

export function CopyCommand({ command }: { command: string }) {
  const { copied, copy } = useCopy();

  return (
    <button type="button" className="command" onClick={() => copy(command)} aria-label={`Copy "${command}"`}>
      <span className="command__prompt" aria-hidden="true">$</span>
      <code>{command}</code>
      <span className="command__hint">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
