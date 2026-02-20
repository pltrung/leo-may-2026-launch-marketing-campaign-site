import React from "react";

/** Wraps each phrase in `highlights` with a span. Uses existing neon-* styles. classNames: single class for all, or array (one per highlight). */
export function withHighlights(
  text: string,
  highlights: string[],
  classNames: string | string[] = "neon-cyan"
): React.ReactNode {
  if (!highlights?.length) return text;
  const getClass = (idx: number) =>
    Array.isArray(classNames) ? classNames[idx] ?? classNames[0] : classNames;
  let remaining = text;
  const parts: React.ReactNode[] = [];
  highlights.forEach((h, idx) => {
    const i = remaining.indexOf(h);
    if (i === -1) return;
    parts.push(remaining.slice(0, i));
    parts.push(
      React.createElement("span", { key: idx, className: getClass(idx) }, h)
    );
    remaining = remaining.slice(i + h.length);
  });
  parts.push(remaining);
  return React.createElement(React.Fragment, null, ...parts);
}
