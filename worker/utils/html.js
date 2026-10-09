export function decodeEntities(value) {
  const named = {
    amp: "&",
    quot: '"',
    apos: "'",
    nbsp: " ",
    lt: "<",
    gt: ">",
    uuml: "ü",
    Uuml: "Ü",
    ouml: "ö",
    Ouml: "Ö",
    ccedil: "ç",
    Ccedil: "Ç",
    scedil: "ş",
    Scedil: "Ş",
    gbreve: "ğ",
    Gbreve: "Ğ",
    Idot: "İ",
    inodot: "ı",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    ndash: "–",
    mdash: "—",
    hellip: "…"
  };

  return String(value || "").replace(
    /&(#x?[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]+);/g,
    (original, entity) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1]?.toLowerCase() === "x";
        const raw = isHex ? entity.slice(2) : entity.slice(1);
        const code = parseInt(raw, isHex ? 16 : 10);

        if (Number.isFinite(code)) {
          try {
            return String.fromCodePoint(code);
          } catch {
            return original;
          }
        }

        return original;
      }

      return Object.prototype.hasOwnProperty.call(named, entity)
        ? named[entity]
        : original;
    }
  );
}

export function cleanHtml(value) {
  return decodeEntities(String(value || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalize(value) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replaceAll("Ç", "C")
    .replaceAll("Ğ", "G")
    .replaceAll("İ", "I")
    .replaceAll("Ö", "O")
    .replaceAll("Ş", "S")
    .replaceAll("Ü", "U");
}

export function extractTitle(html) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanHtml(h1[1]);

  const og = html.match(
    /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
  );

  return og ? cleanHtml(og[1]) : "";
}

export function extractArticleRegion(html) {
  const h1Close = /<\/h1\s*>/i.exec(html);
  const start = h1Close ? h1Close.index + h1Close[0].length : 0;
  const tail = html.slice(start);

  const markers = [
    /Temsilcilikler/i,
    /Üyelikler/i,
    /Di(?:ğ|&#287;|&gbreve;)er\s+Haberler/i,
    /Hizmet\s+Sözleşmesi/i,
    /GENEL\s+KOŞULLAR/i,
    /Footer/i
  ];

  let end = tail.length;
  for (const marker of markers) {
    const found = marker.exec(tail);
    if (found && found.index < end) end = found.index;
  }

  return tail.slice(0, end);
}

export function extractBody(region, title) {
  if (!region) return "";

  const parts = [];
  const regex = /<(p|h2|h3|h4|h5|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = regex.exec(region)) !== null) {
    const text = cleanHtml(match[2]);
    if (!text || text.length < 18) continue;
    if (normalize(text) === normalize(title)) continue;
    if (isNoiseText(text)) continue;
    parts.push(text);
  }

  const unique = [...new Set(parts)];
  if (unique.length) return unique.join(" ").slice(0, 2600);

  const fallback = cleanHtml(region);
  return isNoiseText(fallback) ? "" : fallback.slice(0, 1800);
}

export function extractDate(htmlOrRegion) {
  const text = cleanHtml(htmlOrRegion);
  const regex = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})/i;
  const match = text.match(regex);

  if (!match) return { text: "", time: 0 };

  const months = [
    "OCAK", "SUBAT", "MART", "NISAN", "MAYIS", "HAZIRAN",
    "TEMMUZ", "AGUSTOS", "EYLUL", "EKIM", "KASIM", "ARALIK"
  ];

  const month = months.indexOf(normalize(match[2]));

  return {
    text: `${match[1]} ${match[2]} ${match[3]}`,
    time: month >= 0 ? Date.UTC(Number(match[3]), month, Number(match[1])) : 0
  };
}

export function extractImage(html, baseUrl) {
  const patterns = [
    /<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    try {
      return new URL(decodeEntities(match[1]), baseUrl).href;
    } catch {}
  }

  const direct = html.match(
    /https?:\/\/dosya\.tyf\.gov\.tr\/[^"'<> ]+\.(?:jpg|jpeg|png|webp)/i
  );

  return direct ? decodeEntities(direct[0]) : "";
}

export function extractPdf(region, baseUrl) {
  const match = region.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
  if (!match) return "";

  try {
    return new URL(decodeEntities(match[1]), baseUrl).href;
  } catch {
    return "";
  }
}

export function splitSentences(text) {
  const matches = String(text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches ? matches.map(item => item.trim()).filter(Boolean) : [];
}

export function isNoiseText(text) {
  const value = normalize(text);
  const noise = [
    "BILGILERI PDF FORMATINDA GORUNTULEMEK",
    "PDF FORMATINDA GORUNTULEMEK",
    "TIKLAYINIZ",
    "TUM HAKLARI SAKLIDIR",
    "TEMSILCILIKLER",
    "UYELIKLER",
    "DIGER HABERLER",
    "HIZMET SOZLESMESI",
    "GENEL KOSULLAR",
    "IPTAL IADE KOSULLARI",
    "KISISSEL BILGI GUVENLIGI",
    "ODEME BILGILERI GUVENLIGI",
    "KREDI KARTI",
    "SPORCU VIZE ODEMESI",
    "KVKK",
    "CEREZ"
  ];

  return noise.some(item => value.includes(item));
}
