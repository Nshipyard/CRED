// Shared chart figure: the exact visual structure of a CRED chart.
// Used at full size on /series/[id] (via ChartControls) and at thumbnail
// scale on the home page At a Glance. WYSIWYG: the thumbnail is
// pixel-identical in structure to the shared series chart. Server-safe.

import type { ReactNode } from 'react';

interface ChartFigureProps {
  seriesTitle: string;
  sourceLabel: string;
  children: ReactNode;
  headerRight?: ReactNode;
  footerActions?: ReactNode;
  compareLegend?: ReactNode;
}

export default function ChartFigure({
  seriesTitle,
  sourceLabel,
  children,
  headerRight,
  footerActions,
  compareLegend,
}: ChartFigureProps) {
  return (
    <div className="rounded-xl bg-[#f4f6f9] p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm tracking-wide">CRED</span>
          <span
            className="inline-block h-1 w-10 rounded bg-[#d80621]"
            aria-hidden
          />
          <span className="text-sm text-[#0a0f1e]">{seriesTitle}</span>
          {compareLegend}
        </div>
        {headerRight}
      </div>
      <div className="relative mt-3">{children}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">
          <span>Source: {sourceLabel} via CRED</span>
          <br />
          <em>Shaded areas indicate Canadian recessions (C.D. Howe Institute).</em>
        </div>
        {footerActions}
      </div>
    </div>
  );
}
