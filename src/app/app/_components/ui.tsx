"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0";

export const button = {
  primary: cn(base, "bg-foreground text-background hover:bg-foreground/85"),
  outline: cn(base, "border-[1.5px] border-control bg-background hover:bg-muted"),
  quiet: cn(base, "px-3 hover:bg-muted"),
  danger: cn(base, "border-[1.5px] border-destructive text-destructive hover:bg-destructive/10"),
};

export const field =
  "w-full rounded-xl border-[1.5px] border-control bg-background px-4 py-3 text-lg leading-7 placeholder:text-muted-foreground aria-invalid:border-destructive";

// Keeps typed health details out of browser autofill history, cloud spell check,
// and writing-assistant extensions.
export const phi = {
  autoComplete: "off",
  spellCheck: false,
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
} as const;

export function TopBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-2xl flex-wrap items-center gap-2 px-4 py-2">{children}</div>
    </header>
  );
}

export function Notice({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }) {
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border-[1.5px] border-foreground p-4">
      <p className="flex-1 py-2.5">{children}</p>
      {onDismiss && (
        <button className={button.quiet} onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}

// Native <dialog>: focus stays inside, the page behind is inert, and Escape closes it.
export function Dialog({
  open,
  onClose,
  label,
  describedBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  describedBy?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // A modal left open while Next hides this route would block the next page.
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-describedby={describedBy}
      onClose={onClose}
      className="m-auto w-[min(100%-2rem,34rem)] rounded-2xl bg-background p-6 text-foreground shadow-2xl backdrop:bg-black/60"
    >
      {open && children}
    </dialog>
  );
}

export function ConfirmErase({ open, onClose, onErase }: { open: boolean; onClose: () => void; onErase: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} label="Erase everything" describedBy="erase-warning">
      <h2 className="text-2xl font-semibold tracking-tight">Erase everything?</h2>
      <p id="erase-warning" className="mt-3 text-lg">
        This erases everything Barry knows about you from this device, including your PIN or password. You can&apos;t
        undo this. If your browser saved your PIN or password, delete it there too.
      </p>
      <div className="mt-8 flex flex-col-reverse gap-6 sm:flex-row sm:justify-end">
        <button autoFocus className={button.outline} onClick={onClose}>
          Keep my information
        </button>
        <button className={button.danger} onClick={onErase}>
          Erase everything
        </button>
      </div>
    </Dialog>
  );
}
