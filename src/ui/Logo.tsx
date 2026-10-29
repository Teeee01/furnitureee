/** Forma logo mark + wordmark. */
export function Logo() {
  return (
    <a href="/" className="-my-2.5 flex items-center gap-2 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-fg">
      <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
        <path d="M3.5 6.2 10 2.8l6.5 3.4v7.6L10 17.2l-6.5-3.4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3.5 6.2 10 9.6l6.5-3.4M10 9.6v7.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      Forma
    </a>
  );
}
