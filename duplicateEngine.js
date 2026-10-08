import { normalize } from "./html.js";

export function dedupeArticles(items) {
  const kept = [];

  for (const item of items) {
    const duplicate = kept.some(existing => similarity(existing.originalTitle || existing.title, item.originalTitle || item.title) >= 0.78);
    if (!duplicate) kept.push(item);
  }

  return kept;
}

function similarity(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function tokens(value) {
  return new Set(
    normalize(value)
      .replace(/[^A-Z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(token => token.length >= 3)
  );
}
