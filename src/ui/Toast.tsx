import type { ToastMessage } from "../game/types";

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  // `key` restarts the animation for every new message
  return (
    <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
      {toast.text}
    </div>
  );
}
