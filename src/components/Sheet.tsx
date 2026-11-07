import { useEffect, useRef, type ReactNode } from 'react';

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    let opener = document.activeElement;
    while (opener?.shadowRoot?.activeElement) opener = opener.shadowRoot.activeElement;
    element.showModal();
    return () => {
      if (element.open) element.close();
      if (opener instanceof HTMLElement && opener !== document.body && opener !== document.documentElement && opener.isConnected && !opener.matches(':disabled')) {
        opener.focus({ preventScroll: true });
      } else {
        document.querySelector<HTMLElement>('[data-sheet-focus-fallback]')?.focus();
      }
    };
  }, []);
  return (
    <dialog ref={dialog} className="sheet" aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    } }}>
      <header className="sheet-header"><h2>{title}</h2><button type="button" aria-label="Close" className="close-button" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      {children}
    </dialog>
  );
}
