// CRED chart mark: white rounded square, thin ink border, blue line rising
// over a green line. Mirrors the FRED-style lockup: the mark sits to the
// right of the wordmark on a white background.
export default function CredMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="CRED chart mark"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="13"
        fill="#ffffff"
        stroke="#0a0f1e"
        strokeWidth="3"
      />
      <polyline
        points="12,50 22,47 30,49 40,43 52,36"
        fill="none"
        stroke="#3e9e5c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="12,42 20,42 26,30 33,36 41,22 52,13"
        fill="none"
        stroke="#2456d6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
