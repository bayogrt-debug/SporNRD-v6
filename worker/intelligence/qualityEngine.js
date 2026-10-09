import { normalize } from "./html.js";

const CLICKBAIT = [
  "ŞOK", "İNANILMAZ", "BOMBA", "KAÇIRMAYIN", "HERKES BUNU KONUŞUYOR", "SON DAKİKA"
];

export function scoreHeadline(candidate, facts) {
  const text = String(candidate || "").trim();
  if (!text) return -100;

  let score = 50;
  const length = text.length;

  if (length >= 36 && length <= 88) score += 15;
  else if (length < 24 || length > 120) score -= 12;

  if (facts.location !== "Türkiye" && normalize(text).includes(normalize(facts.location))) score += 6;
  if (facts.eventDate && text.includes(facts.eventDate)) score += 7;
  if (facts.grade && text.includes(facts.grade)) score += 5;
  if (facts.actionRequired) score += 2;

  const upper = normalize(text);
  for (const bad of CLICKBAIT) {
    if (upper.includes(normalize(bad))) score -= 25;
  }

  if (/!{2,}/.test(text)) score -= 10;
  if ((text.match(/\?/g) || []).length > 1) score -= 8;

  return score;
}

export function scoreSummary(summary, facts) {
  const text = String(summary || "").trim();
  if (!text) return 0;

  let score = 50;
  if (text.length >= 100 && text.length <= 360) score += 15;
  if (facts.actionRequired && /gerek|başvuru|kayıt|tamamla/i.test(text)) score += 8;
  if (facts.eventDate && text.includes(facts.eventDate)) score += 6;
  if (facts.location !== "Türkiye" && text.includes(facts.location)) score += 4;
  return score;
}
