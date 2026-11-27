/** Hand-drawn icon set: 24px grid, currentColor, no icon font, no dependency. */
type P = { className?: string };
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconBook = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/></svg>
);
export const IconPulse = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 12h4l2.5-7 4 14 2.5-7H21"/></svg>
);
export const IconTarget = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></svg>
);
export const IconClock = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
);
export const IconCloud = ({ className }: P) => (
  <svg {...base} className={className}><path d="M7.5 18.5h9a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.3 10.4 3.75 3.75 0 0 0 7.5 18.5z"/><path d="M12 14.5v-3"/></svg>
);
export const IconPlay = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="8.5"/><path d="M10.2 9.3l4.3 2.7-4.3 2.7z"/></svg>
);
export const IconCheck = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12.5l4.5 4.5L19 7"/></svg>
);
export const IconArrow = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12h13"/><path d="M12.5 6l6 6-6 6"/></svg>
);
export const IconDoc = ({ className }: P) => (
  <svg {...base} className={className}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15.5h5"/></svg>
);
