import { normalize } from "./html.js";

export function classifyArticle(title, body) {
  const titleText = normalize(title);
  const allText = normalize(`${title} ${body}`);

  if (hasAny(titleText, ["GENEL KURUL", "DELEGE", "IHALE", "SATIN ALMA"])) {
    return result(false, "announcement", "general", 0);
  }

  if (
    titleText.includes("SPORCU") ||
    titleText.includes("SEM ") ||
    titleText.includes("SEM)") ||
    titleText.includes("TOHM") ||
    titleText.includes("MILLI TAKIM") ||
    titleText.includes("MILLI SPORCU")
  ) {
    return result(true, "athlete", "sporcu", 10);
  }

  if (titleText.includes("ANTRENOR")) {
    return result(true, "coach", "antrenör", 10);
  }

  if (hasAny(titleText, [
    "SAMPIYONA", "MUSABAKA", "YARISMA", "YARIS", "LIG", "KUPA", "TURNUVA", "FINAL"
  ])) {
    return result(true, "event", "sporcu", 9);
  }

  if (hasAny(titleText, ["KURS", "SEMINER", "EGITIM"])) {
    return result(true, "education", "general", 7);
  }

  if (hasAny(allText, ["BASVURU", "KAYIT", "KRITER", "DUYURU", "TAKVIM", "BILGILENDIRME"])) {
    return result(true, "announcement", "general", 5);
  }

  return result(false, "announcement", "general", 0);
}

function hasAny(text, list) {
  return list.some(item => text.includes(item));
}

function result(keep, category, audience, score) {
  return { keep, category, audience, score };
}
