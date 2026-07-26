"use client";

import { ChevronLeft, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export function ResponsiveDrawer({
  open,
  title,
  onClose,
  onBack,
  returnFocusRef,
  children,
  footer,
  closeLabel = "Close drawer",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = returnFocusRef?.current;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, input, [tabindex='0']")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div className={`fixed inset-0 z-[80] transition-[visibility] duration-200 motion-reduce:transition-none ${open ? "visible" : "invisible"}`} aria-hidden={!open}>
      <button type="button" tabIndex={open ? 0 : -1} aria-label={closeLabel} className={`absolute inset-0 h-full w-full bg-black/25 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-2xl border-t border-[var(--color-border)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out motion-reduce:transition-none md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0 ${open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"}`}>
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--color-border-strong)] md:hidden" />
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3">
          {onBack ? <button type="button" aria-label="Back" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><ChevronLeft aria-hidden className="h-5 w-5" /></button> : null}
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-black">{title}</h2>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin]">{children}</div>
        {footer ? <div className="shrink-0 border-t border-[var(--color-border)] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </aside>
    </div>
  );
}
