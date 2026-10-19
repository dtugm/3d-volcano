/** Volcano mark: a crater-topped cone with a puff of ash. Drawn in `currentColor`. */
export function VolcanoLogo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={className}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* ash puffs */}
      <rect x="15" y="0.5" width="21" height="12.5" rx="6.25" />
      <circle cx="43" cy="12.5" r="6.5" />
      {/* cone with a rounded crater notch */}
      <path d="M8 55.5C4.5 55.5 2.5 52.5 4 49.5L19 25C20.5 22.5 23.5 21.5 26 22.5L30 24.5C32 25.5 35 25.5 37 24.5L41 22.5C43.5 21.5 46.5 22.5 47.5 25L60.5 49.5C62 52.5 58 55.5 54.5 55.5Z" />
    </svg>
  );
}
