'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Native dialogs supply focus containment, Escape and an inert background. */
export default function Modal({ open = true, onClose, label, children, className = '' }: Readonly<{
  open?: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef<number | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      backdropPointer.current = null;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  return <dialog ref={ref} aria-label={label}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }}
    onPointerDownCapture={(event) => {
      if (!event.isPrimary) return;
      backdropPointer.current = event.button === 0 && event.target === event.currentTarget
        ? event.pointerId
        : null;
    }}
    onPointerUpCapture={(event) => {
      if (backdropPointer.current !== event.pointerId) return;
      // Touch pointer capture can keep the backing dialog as the event target after a drag.
      const releasedOverBackdrop = document.elementFromPoint(event.clientX, event.clientY) === event.currentTarget;
      if (!releasedOverBackdrop) backdropPointer.current = null;
    }}
    onPointerCancelCapture={(event) => {
      if (backdropPointer.current === event.pointerId) backdropPointer.current = null;
    }}
    onClick={(event) => {
      // A selection started in the panel can produce a click targeted at its ancestor dialog.
      const startedOnBackdrop = backdropPointer.current !== null;
      backdropPointer.current = null;
      if (startedOnBackdrop && event.target === event.currentTarget) onClose();
    }}
    className={`fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-transparent p-4 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center ${className}`}>
    {children}
  </dialog>;
}
