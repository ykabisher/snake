/**
 * Button icons, drawn as SVG so they look the same on every device (emoji
 * arrows vary wildly between platforms). They take the button's text colour.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PlayIcon() {
  return (
    <svg {...base} className="icon">
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </svg>
  );
}

export function RetryIcon() {
  return (
    <svg {...base} className="icon">
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.8 3.8v4.6h-4.6" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg {...base} className="icon">
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...base} className="icon">
      {/* points right: "back" in a right-to-left page */}
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
