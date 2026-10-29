import { cn } from "../ui/cn";

/** A scene snapshot on the platform background (rounded 12 px). */
export function Thumb({ src, className, alt = "" }: { src?: string; className?: string; alt?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-xl border border-line bg-input", className)}>
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" draggable={false} />
      ) : (
        <svg viewBox="0 0 40 40" className="size-full p-[22%] text-muted" fill="none" aria-hidden="true">
          <path d="M6 15 20 8l14 7v12l-14 7-14-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
