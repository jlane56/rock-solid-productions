"use client";

export function PrintBriefButton() {
  return (
    <button className="button button-secondary no-print" type="button" onClick={() => window.print()}>
      Save / Print
    </button>
  );
}
