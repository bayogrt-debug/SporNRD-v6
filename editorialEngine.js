import { cleanHtml, normalize, splitSentences } from "./html.js";
import { scoreHeadline, scoreSummary } from "./qualityEngine.js";

export function buildEditorial({ originalTitle, originalText, category, facts, pdfUrl }) {
  const titleCandidates = buildTitleCandidates(originalTitle, category, facts);
  const scoredTitles = titleCandidates
    .map(title => ({ title, score: scoreHeadline(title, facts) }))
    .sort((a, b) => b.score - a.score);

  const title = scoredTitles[0]?.title || cleanDisplayTitle(originalTitle);

  const summaryCandidates = buildSummaryCandidates({
    originalTitle,
    originalText,
    category,
    facts,
    pdfUrl
  });

  const scoredSummaries = summaryCandidates
    .map(summary => ({ summary, score: scoreSummary(summary, facts) }))
    .sort((a, b) => b.score - a.score);

  const summary = scoredSummaries[0]?.summary || fallbackSummary(category, pdfUrl);

  return {
    title,
    summary,
    titleCandidates: scoredTitles.slice(0, 4),
    summaryCandidates: scoredSummaries.slice(0, 3),
    actionLabel: actionLabelFor(category, facts),
    tags: buildTags(category, facts),
    qualityScore: Math.round(((scoredTitles[0]?.score || 0) + (scoredSummaries[0]?.score || 0)) / 2)
  };
}

function buildTitleCandidates(originalTitle, category, facts) {
  const n = normalize(originalTitle);
  const candidates = [];

  if (n.includes("SEM") && n.includes("KAYIT HAKKI KAZANAN")) {
    candidates.push(
      "SEM’de kayıt hakkı kazanan yüzücüler açıklandı 🏊",
      "SEM yüzme sonuçları belli oldu: Kayıt hakkı kazanan sporcular açıklandı",
      "SEM yüzme listesi yayımlandı: Kayıt hakkı kazanan sporcular belli oldu"
    );
  }

  if (n.includes("BEBEK") && n.includes("SEMINER")) {
    const when = facts.eventDate ? `: ${facts.eventDate}` : "";
    const where = facts.location !== "Türkiye" ? `${facts.location}’da` : "";
    candidates.push(
      `Bebek yüzme gelişim semineri ${where}${when} 🏊‍♀️`.replace(/\s+/g, " ").trim(),
      `Bebek yüzme eğitimi için yeni seminer duyuruldu${facts.location !== "Türkiye" ? `: ${facts.location}` : ""}`,
      `TYF’den bebek yüzme gelişim semineri duyurusu${when}`
    );
  }

  if (n.includes("ANTRENOR") && n.includes("KURS")) {
    const grade = facts.grade ? `${facts.grade}. Kademe ` : "";
    const place = facts.location !== "Türkiye" ? ` ${facts.location}’da` : "";
    const when = facts.eventDate ? `: ${facts.eventDate}` : "";
    candidates.push(
      `${grade}yüzme antrenörlüğü kursu${place}${when}`,
      `${grade}antrenörlük kursu için yeni dönem duyuruldu${place}`,
      `Yüzme antrenörleri için ${grade.toLocaleLowerCase("tr-TR")}kurs duyurusu yayımlandı`
    );
  }

  if (n.includes("ANTRENOR VIZE")) {
    candidates.push(
      "Yüzme antrenörleri için vize işlemleri duyuruldu",
      "Antrenör vize süreci için yeni TYF duyurusu",
      "Yüzme antrenörlerinin vize işlemlerinde yeni bilgilendirme"
    );
  }

  if (n.includes("TOHM") && n.includes("BASVURU")) {
    candidates.push(
      "TOHM sporcu başvurularında yeni dönem",
      "TOHM başvuruları için yeni bilgilendirme yayımlandı",
      "TOHM’a başvuracak sporcular için önemli duyuru"
    );
  }

  if (category === "event") {
    candidates.push(
      `${cleanDisplayTitle(stripBilingualTail(originalTitle))} 🏆`,
      `Yüzmede yeni yarışma duyurusu: ${cleanDisplayTitle(stripBilingualTail(originalTitle))}`
    );
  }

  if (category === "education") {
    candidates.push(
      cleanDisplayTitle(stripBilingualTail(originalTitle)),
      `Yüzme camiasına yeni eğitim duyurusu: ${cleanDisplayTitle(stripBilingualTail(originalTitle))}`
    );
  }

  if (category === "athlete") {
    candidates.push(
      cleanDisplayTitle(stripBilingualTail(originalTitle)),
      `Yüzücüleri ilgilendiren yeni TYF duyurusu`
    );
  }

  if (category === "announcement") {
    candidates.push(
      cleanDisplayTitle(stripBilingualTail(originalTitle)),
      `TYF’den yeni duyuru: ${cleanDisplayTitle(stripBilingualTail(originalTitle))}`
    );
  }

  if (!candidates.length) candidates.push(cleanDisplayTitle(originalTitle));

  return [...new Set(candidates.filter(Boolean))];
}

function buildSummaryCandidates({ originalTitle, originalText, category, facts, pdfUrl }) {
  const title = normalize(originalTitle);
  const body = cleanHtml(originalText);
  const summaries = [];

  if (title.includes("SEM") && title.includes("KAYIT HAKKI KAZANAN")) {
    const first = facts.dateRange
      ? `${facts.dateRange} tarihleri arasında e-Devlet üzerinden yapılan başvuruların ardından SEM yüzme branşında kayıt hakkı kazanan sporcular açıklandı.`
      : "SEM yüzme branşında kayıt hakkı kazanan sporcular açıklandı.";

    const second = facts.businessDays
      ? `Hak kazanan sporcuların kayıt işlemlerini ${facts.businessDays} iş günü içinde tamamlaması gerekiyor.`
      : "Hak kazanan sporcuların kayıt sürecini resmî duyurudaki takvime göre tamamlaması gerekiyor.";

    summaries.push(`${first} ${second}`);
  }

  if (title.includes("BEBEK") && title.includes("SEMINER")) {
    const when = facts.eventDate ? `${facts.eventDate} tarihlerinde` : "yaklaşan dönemde";
    const where = facts.location !== "Türkiye" ? `${facts.location}’da` : "";

    summaries.push(
      `TYF, Bebek Yüzme Gelişim Semineri’ni ${when} ${where} düzenleyecek. Katılım, program ve başvuru ayrıntıları federasyonun resmî duyurusunda yer alıyor.`.replace(/\s+/g, " ").trim()
    );
  }

  if (title.includes("ANTRENOR") && title.includes("KURS")) {
    const grade = facts.grade ? `${facts.grade}. Kademe ` : "";
    const details = [facts.eventDate, facts.location !== "Türkiye" ? facts.location : ""].filter(Boolean).join(" · ");

    summaries.push(
      `TYF, ${grade}yüzme antrenörlüğü kursuna ilişkin yeni duyuruyu yayımladı.${details ? ` Kurs ${details} bilgileriyle duyuruldu.` : ""} ${pdfUrl ? "Başvuru ve katılım ayrıntıları resmî PDF duyurusunda yer alıyor." : "Başvuru ve katılım ayrıntıları resmî kaynakta yer alıyor."}`
    );
  }

  if (title.includes("ANTRENOR VIZE")) {
    summaries.push(
      "TYF, yüzme antrenörlerinin vize işlemlerine ilişkin yeni bilgilendirme yayımladı. İşlem koşulları ve gerekli adımlar resmî duyuruda yer alıyor."
    );
  }

  if (title.includes("TOHM") && title.includes("BASVURU")) {
    summaries.push(
      "TYF, TOHM sporcu başvurularına ilişkin yeni bilgilendirme yayımladı. Başvuru koşulları, tarihler ve gerekli belgeler için resmî duyurunun kontrol edilmesi gerekiyor."
    );
  }

  const factual = bestSentences(body, [
    "başvuru", "kayıt", "gerekmektedir", "tarih", "sporcu", "antrenör", "şampiyona", "müsabaka", "duyurulur"
  ], 2);

  if (factual) summaries.push(shorten(factual, 360));

  if (category === "event") {
    summaries.push(
      `TYF, ${toSentenceCase(stripBilingualTail(originalTitle))} için yeni yarışma duyurusunu yayımladı. Katılım, tarih ve organizasyon ayrıntıları resmî kaynakta yer alıyor.`
    );
  }

  if (category === "education") {
    summaries.push(
      "TYF, yüzme camiasına yönelik yeni bir eğitim veya seminer duyurusu yayımladı. Tarih, katılım ve başvuru ayrıntıları resmî kaynakta yer alıyor."
    );
  }

  if (category === "athlete") {
    summaries.push(
      "TYF, sporcuları ilgilendiren yeni bir resmî duyuru yayımladı. Kayıt, başvuru veya katılım ayrıntıları federasyonun resmî kaynağında yer alıyor."
    );
  }

  if (!summaries.length) summaries.push(fallbackSummary(category, pdfUrl));

  return [...new Set(summaries.filter(Boolean))];
}

function actionLabelFor(category, facts) {
  if (facts.topic === "SEM sonuçları") return "Listeyi Kontrol Et";
  if (facts.topic === "Antrenör kursu") return "Kurs Detayları";
  if (facts.topic === "Antrenör vize") return "Vize Detayları";
  if (facts.topic === "TOHM") return "Başvuruyu İncele";
  if (category === "event") return "Yarışmayı İncele";
  if (category === "education") return "Eğitimi İncele";
  if (category === "athlete") return "Sporcu Duyurusunu İncele";
  return "Detay";
}

function buildTags(category, facts) {
  const tags = ["Yüzme"];
  if (category === "coach") tags.push("Antrenör");
  if (category === "athlete") tags.push("Sporcu");
  if (category === "event") tags.push("Yarışma");
  if (category === "education") tags.push("Eğitim");
  if (facts.topic === "SEM sonuçları") tags.push("SEM");
  if (facts.topic === "TOHM") tags.push("TOHM");
  return [...new Set(tags)];
}

function fallbackSummary(category, pdfUrl) {
  const map = {
    coach: "TYF, antrenörleri ilgilendiren yeni bir resmî duyuru yayımladı.",
    athlete: "TYF, sporcuları ilgilendiren yeni bir resmî duyuru yayımladı.",
    event: "TYF, yeni bir yarışma veya şampiyona duyurusu yayımladı.",
    education: "TYF, yeni bir eğitim veya seminer duyurusu yayımladı.",
    announcement: "TYF, yeni bir resmî spor duyurusu yayımladı."
  };

  return `${map[category] || map.announcement} ${pdfUrl ? "Ayrıntılar resmî PDF duyurusunda yer alıyor." : "Ayrıntılar resmî kaynakta yer alıyor."}`;
}

function bestSentences(text, keywords, count) {
  const sentences = splitSentences(text);

  const ranked = sentences.map((sentence, index) => {
    const lower = sentence.toLocaleLowerCase("tr-TR");
    let score = 0;

    for (const keyword of keywords) {
      if (lower.includes(keyword.toLocaleLowerCase("tr-TR"))) score += 3;
    }

    if (/\d/.test(sentence)) score += 1;
    return { sentence, index, score };
  });

  return ranked
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence)
    .join(" ");
}

function stripBilingualTail(title) {
  return cleanHtml(title)
    .replace(/\s+INTERNATIONAL\b[\s\S]*$/i, "")
    .replace(/\s+SHORT\s+COURSE\b[\s\S]*$/i, "")
    .trim();
}

function cleanDisplayTitle(title) {
  const text = toSentenceCase(cleanHtml(title));
  return text.length <= 105 ? text : shorten(text, 105);
}

function toSentenceCase(value) {
  const text = cleanHtml(value);
  if (!text) return "";
  const lower = text.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

function shorten(value, max) {
  const text = cleanHtml(value);
  if (text.length <= max) return text;
  const part = text.slice(0, max);
  const space = part.lastIndexOf(" ");
  return part.slice(0, space > 0 ? space : max) + "…";
}
