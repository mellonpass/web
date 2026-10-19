export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "danger" | "warning";
  durationMs: number;
  createdAt: number;
  isClipboard?: boolean;
  copiedValue?: string;
  remainingSeconds?: number;
}

const CLIPBOARD_CLEAR_SECONDS = 30;

class ToastManager {
  toasts: ToastItem[] = $state([]);
  private clipboardTimer: ReturnType<typeof setInterval> | null = null;
  private activeClipboardValue: string | null = null;

  show({
    title,
    description,
    variant = "default",
    durationMs = 4000,
  }: {
    title: string;
    description?: string;
    variant?: "default" | "success" | "danger" | "warning";
    durationMs?: number;
  }) {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      title,
      description,
      variant,
      durationMs,
      createdAt: Date.now(),
    };
    this.toasts = [...this.toasts, item];

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  async copySecret(value: string, label: string = "Secret", sensitive: boolean = true) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback if clipboard API fails
    }

    // Remove any existing clipboard toast
    this.clearClipboardTimer();
    this.toasts = this.toasts.filter((t) => !t.isClipboard);

    if (!sensitive) {
      this.show({
        title: `${label} copied to clipboard`,
        variant: "success",
        durationMs: 3000,
      });
      return;
    }

    const id = crypto.randomUUID();
    this.activeClipboardValue = value;

    const item: ToastItem = {
      id,
      title: `${label} copied`,
      description: `Auto-clearing clipboard in ${CLIPBOARD_CLEAR_SECONDS}s`,
      variant: "success",
      durationMs: CLIPBOARD_CLEAR_SECONDS * 1000,
      createdAt: Date.now(),
      isClipboard: true,
      copiedValue: value,
      remainingSeconds: CLIPBOARD_CLEAR_SECONDS,
    };

    this.toasts = [...this.toasts, item];

    this.clipboardTimer = setInterval(async () => {
      const target = this.toasts.find((t) => t.id === id);
      if (!target || target.remainingSeconds === undefined) {
        this.clearClipboardTimer();
        return;
      }

      target.remainingSeconds -= 1;
      target.description = `Auto-clearing clipboard in ${target.remainingSeconds}s`;

      if (target.remainingSeconds <= 0) {
        await this.clearClipboardNow(id);
      }
    }, 1000);
  }

  async clearClipboardNow(toastId?: string) {
    const expected = this.activeClipboardValue;
    this.clearClipboardTimer();

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        // Smart check: if readText is permitted, only clear if clipboard still holds the secret
        let shouldClear = true;
        try {
          const current = await navigator.clipboard.readText();
          if (expected && current !== expected) {
            shouldClear = false;
          }
        } catch {
          // readText permission not granted; proceed with safe clear
          shouldClear = true;
        }
        if (shouldClear) {
          await navigator.clipboard.writeText("");
        }
      } catch {
        // Ignore clipboard errors when window is unfocused
      }
    }

    this.activeClipboardValue = null;
    if (toastId) {
      this.dismiss(toastId);
    } else {
      this.toasts = this.toasts.filter((t) => !t.isClipboard);
    }
  }

  keepInClipboard(toastId: string) {
    this.clearClipboardTimer();
    this.activeClipboardValue = null;
    this.dismiss(toastId);
  }

  dismiss(id: string) {
    const target = this.toasts.find((t) => t.id === id);
    if (target?.isClipboard) {
      this.clearClipboardTimer();
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private clearClipboardTimer() {
    if (this.clipboardTimer) {
      clearInterval(this.clipboardTimer);
      this.clipboardTimer = null;
    }
  }
}

export const toast = new ToastManager();
