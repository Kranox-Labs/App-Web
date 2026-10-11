import { useEffect, useSyncExternalStore } from "react";

// A short toast at the foot of the page, such as "Copied", as the app shows one.
interface Toast {
  id: number;
  text: string;
}

const TOAST_MS = 1600;

const listeners = new Set<() => void>();
let current: Toast | null = null;
let next = 1;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows [text] for a moment. */
export function showToast(text: string): void {
  current = { id: next++, text };
  emit();
}

/** The place of the toast: the foot of the page, in the middle. */
export function ToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current);
  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => {
      if (current?.id === toast.id) {
        current = null;
        emit();
      }
    }, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return (
    <div className="toast-host" aria-live="polite">
      {toast !== null && (
        <p key={toast.id} className="toast t-small-strong">
          {toast.text}
        </p>
      )}
    </div>
  );
}
