'use client';

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded bg-[#d80621] px-4 py-1.5 text-sm font-medium text-white"
    >
      Retry
    </button>
  );
}
