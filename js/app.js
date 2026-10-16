/* =========================================================
   SporNRD - js/app.js | 6.1.7-profile-preview
   TEMEL: 6.1.6-preview
   Yeni: Genel kurumsal kaynak profil sistemi.
   Korunan: preview feed, ranking, learning, filtreler,
   yerel cache, keşfet, detay, Woow/Çöp/Kaydet/Paylaş.
   ========================================================= */
"use strict";

const APP_VERSION = "6.1.7-profile-preview";
/* Önceki anahtarlar kasıtlı olarak korunmuştur. */
const CACHE_KEY = "spornrd_feed_v6_1_6_preview";
const FILTER_KEY = "spornrd_filters_v1";
const INTERACTION_KEY = "spornrd_interactions_v2";
/* Kurumsal profil etkileşimleri yalnızca bu cihazda saklanır. */
const SOURCE_ENGAGEMENT_KEY = "spornrd_source_engagement_v1";
let sourceEngagement = {};

const OLD_CACHE_KEYS = [
  "spornrd_feed_v6_1_5_preview", "spornrd_feed_v6_1_4_preview",
  "spornrd_feed_v6_0_4_multi", "spornrd_feed_v6"
];
const FILTER_TYPES = ["city", "sport", "category", "subCategory"];
const TURKEY_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
  "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
  "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
  "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin",
  "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu",
  "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon",
  "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

function createDefaultFilters() {
  return { city: "all", sport: "all", category: "all", subCategory: "all" };
}
function createDefaultFilterQueries() {
  return { city: "", sport: "", category: "", subCategory: "" };
}
const state = {
  posts: [], interactions: {}, category: "all", filters: createDefaultFilters(),
  draftFilters: createDefaultFilters(), filterQueries: createDefaultFilterQueries(),
  currentPage: "feedPage", lastUpdate: null, sources: [], feedVersion: null,
  selectionMode: null, summary: null,
  profile: { sourceId: "", tab: "posts", category: "all", returnPage: "sourcesPage", returnScroll: 0 }
};
const feedContainer = document.getElementById("feedContainer");
const statusBox = document.getElementById("statusBox");

/* GENEL ARAÇLAR */
function cleanString(v) {
  if (v === null || v === undefined || typeof v === "object") return "";
  return String(v).replace(/\s+/g, " ").trim();
}
function firstString(...values) {
  for (const value of values) { const str = cleanString(value); if (str) return str; }
  return "";
}
function isPlainObject(v) { return Boolean(v && typeof v === "object" && !Array.isArray(v)); }
function normalizeText(v) {
  return String(v ?? "").toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c").replaceAll("ğ", "g").replaceAll("ı", "i")
    .replaceAll("ö", "o").replaceAll("ş", "s").replaceAll("ü", "u")
    .replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeId(v) { return normalizeText(v).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function isSafeUrl(v) {
  try { const u = new URL(String(v || "")); return u.protocol === "https:" || u.protocol === "http:"; }
  catch { return false; }
}
function safeNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v); return Number.isFinite(n) ? n : null;
}
function truncateText(value, maxLength) {
  const t = cleanString(value);
  return !t || t.length <= maxLength ? t : `${t.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}
function hashText(v) {
  let hash = 0; const text = String(v || "");
  for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}
function titleCaseTurkish(v) {
  return cleanString(v).toLocaleLowerCase("tr-TR").split(" ").filter(Boolean)
    .map(word => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1)).join(" ");
}
function titleFromId(v) { return titleCaseTurkish(cleanString(v).replace(/[_-]+/g, " ")); }
function canonicalCityName(v) {
  const t = cleanString(v); if (!t) return "";
  return TURKEY_CITIES.find(c => normalizeText(c) === normalizeText(t)) || t;
}
function sourceFromConfig(sourceId, field) {
  return window.SPORNRD_CONFIG?.sources?.[cleanString(sourceId).toLowerCase()]?.[field] || "";
}
function sportNameFromId(value) {
  const names = {
    swimming:"Yüzme", basketball:"Basketbol", volleyball:"Voleybol", gymnastics:"Cimnastik",
    football:"Futbol", athletics:"Atletizm", tennis:"Tenis", handball:"Hentbol",
    wrestling:"Güreş", judo:"Judo", karate:"Karate", taekwondo:"Tekvando"
  };
  return names[normalizeId(value)] || titleFromId(normalizeId(value));
}
function getSportName(post) {
  return sourceFromConfig(post?.sourceId, "sportLabel") || sportNameFromId(post?.sport) || "Spor";
}
function sportEmoji(v) {
  return ({ basketball:"🏀", swimming:"🏊", volleyball:"🏐", gymnastics:"🤸",
    football:"⚽", athletics:"🏃", tennis:"🎾", handball:"🤾", wrestling:"🤼",
    judo:"🥋", karate:"🥋", taekwondo:"🥋" })[normalizeId(v)] || "🏆";
}
function getPostEmoji(p) { return p?.emoji || sportEmoji(p?.sport); }
function categoryName(v) {
  return ({ news:"HABER", course:"KURS", event:"ETKİNLİK", campaign:"KAMPANYA",
    jobs:"İŞ İLANI", stores:"MAĞAZA" })[normalizeId(v)] || "SPOR";
}
function subCategoryName(v) {
  const names = {
    announcement:"Duyuru", development:"Gelişme", achievement:"Başarı", result:"Sonuç",
    assignment:"Görevlendirme", transfer:"Transfer", competition:"Müsabaka",
    education:"Eğitim", camp:"Kamp", festival:"Festival", swimming:"Yüzme",
    basketball:"Basketbol", volleyball:"Voleybol", gymnastics:"Cimnastik",
    course_campaign:"Kurs Kampanyası", membership_campaign:"Üyelik Kampanyası",
    store_campaign:"Mağaza Kampanyası", employer:"İşveren İlanı", job_seeker:"İş Arayan",
    nutrition:"Beslenme", clothing:"Giyim", equipment:"Ekipman", accessories:"Aksesuar"
  };
  const id = normalizeId(v); return names[id] || (id ? titleFromId(id) : "");
}
function intentName(v) {
  return ({ opportunity:"Fırsat", registration:"Kayıt / Başvuru", result:"Sonuç",
    achievement:"Başarı", assignment:"Görevlendirme", transfer:"Transfer",
    announcement:"Duyuru", campaign:"Kampanya", job:"İş İlanı", product:"Ürün", news:"Haber" })[normalizeId(v)] || "";
}
function getSourceName(post) {
  return firstString(post?.sourceName, typeof post?.source === "string" ? post.source : "",
    post?.sourceMeta?.name, sourceFromConfig(post?.sourceId,"name"), "Resmî Spor Kaynağı");
}
function getSourceShortName(post) {
  return firstString(post?.sourceShortName, post?.sourceMeta?.shortName,
    sourceFromConfig(post?.sourceId,"shortName"), post?.sourceId ? String(post.sourceId).toUpperCase() : "SPOR");
}
function formatPrice(price,currency) { const p = cleanString(price); return p ? `${p}${cleanString(currency) ? " " + cleanString(currency) : ""}` : ""; }
function formatScore(v) { const n = Number(v); return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : ""; }
function formatHumanDate(v) {
  const text = cleanString(v); if (!text) return ""; const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  try { return new Intl.DateTimeFormat("tr-TR", {day:"numeric",month:"short",year:"numeric"}).format(date); }
  catch { return text; }
}
function getPostTimestamp(post) {
  for (const v of [post?.sourceMeta?.publishedAt,post?.lifecycle?.publishedAt,post?.temporal?.publishedAt,post?.date]) {
    const n = new Date(v || "").getTime(); if (Number.isFinite(n)) return n;
  }
  return 0;
}
function formatTime(value) {
  if (!value) return "-";
  try { const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("tr-TR", {hour:"2-digit",minute:"2-digit"}).format(d); }
  catch { return "-"; }
}
function findActionUrl(actions,type) {
  if (!Array.isArray(actions)) return "";
  return actions.find(a => a && a.enabled !== false && normalizeId(a.type) === normalizeId(type) && isSafeUrl(a.url))?.url || "";
}
function findActionLabel(actions,type) {
  return Array.isArray(actions) ? cleanString(actions.find(a => a && normalizeId(a.type) === normalizeId(type))?.label) : "";
}
function findMediaUrl(media,type) {
  return Array.isArray(media) ? (media.find(m => m && normalizeId(m.type) === normalizeId(type) && isSafeUrl(m.url))?.url || "") : "";
}
function buildLocationText(locationMeta,legacyLocation) {
  if (typeof legacyLocation === "string" && cleanString(legacyLocation)) return cleanString(legacyLocation);
  const o = isPlainObject(locationMeta) ? locationMeta : {};
  const parts = [...new Set([o.venue,o.district,o.city].map(cleanString).filter(Boolean))];
  return parts.length ? parts.join(" · ") : cleanString(o.country) || "Türkiye";
}
function extractPostCity(post,locationMeta,locationText) {
  const details = isPlainObject(post?.details) ? post.details : {};
  const facts = isPlainObject(post?.facts) ? post.facts : {};
  const explicit = firstString(locationMeta?.city,details.city,facts.city,typeof post?.city === "string" ? post.city : "");
  if (explicit) return canonicalCityName(explicit);
  const haystack = normalizeText([
    locationText,post?.editorial?.originalTitle,post?.editorial?.originalText,
    post?.originalTitle,post?.originalText,post?.title,post?.summary
  ].filter(Boolean).join(" "));
  for (const city of TURKEY_CITIES) {
    const n = normalizeText(city);
    if (haystack === n || haystack.startsWith(n+" ") || haystack.endsWith(" "+n) || haystack.includes(" "+n+" ")) return city;
  }
  return "";
}
function buildPostDate(post) {
  const details = isPlainObject(post?.details) ? post.details : {};
  if (["course","event","campaign","jobs"].includes(normalizeId(post?.category))) {
    const eventDate = firstString(details.startDate,details.eventDate,details.registrationDeadline,details.applicationDeadline);
    if (eventDate) return formatHumanDate(eventDate);
  }
  return formatHumanDate(firstString(post?.date,post?.source?.publishedAt,post?.sourceMeta?.publishedAt,
    post?.lifecycle?.publishedAt,post?.temporal?.publishedAt));
}

/* FEED POST NORMALIZER */
function normalizePreviewPost(post) {
  if (!post || typeof post !== "object") return null;
  const sourceMeta = isPlainObject(post.source) ? post.source : (isPlainObject(post.sourceMeta) ? post.sourceMeta : {});
  const locationMeta = isPlainObject(post.location) ? post.location : (isPlainObject(post.locationMeta) ? post.locationMeta : {});
  const editorial = isPlainObject(post.editorial) ? post.editorial : {};
  let sourceId = normalizeId(firstString(post.sourceId,sourceMeta.id));
  const sourceName = firstString(typeof post.source === "string" ? post.source : "",post.sourceName,sourceMeta.name,
    sourceFromConfig(sourceId,"name"),"Resmî Spor Kaynağı");
  if (!sourceId) {
    const n = normalizeText(sourceName);
    if (n.includes("turkiye yuzme federasyonu")) sourceId = "tyf";
    else if (n.includes("turkiye basketbol federasyonu")) sourceId = "tbf";
  }
  const title = firstString(editorial.headline,post.title,editorial.originalTitle,post.originalTitle,"Spor duyurusu");
  const summary = firstString(editorial.influencerText,post.summary,editorial.originalText,post.originalText);
  const sourceUrl = firstString(post.url,findActionUrl(post.actions,"source"),sourceMeta.url,sourceMeta.website);
  const detailUrl = firstString(findActionUrl(post.actions,"detail"),sourceUrl);
  const pdfUrl = firstString(post.pdfUrl,findActionUrl(post.actions,"pdf"),findMediaUrl(post.media,"pdf"));
  const image = firstString(post.image,findMediaUrl(post.media,"image"));
  const category = normalizeId(post.category || "news") || "news";
  const locationText = buildLocationText(locationMeta,post.location);
  const sourceVerified = sourceFromConfig(sourceId,"verified");
  return {
    ...post, schemaVersion:post.schemaVersion || "1.2",
    id:firstString(post.id,post.externalId,`${sourceId || "source"}-${hashText(`${title}-${sourceUrl}`)}`),
    sourceId,source:sourceName,sourceName,
    sourceShortName:firstString(post.sourceShortName,sourceMeta.shortName,sourceFromConfig(sourceId,"shortName"),sourceId.toUpperCase() || "SPOR"),
    sourceType:firstString(post.sourceType,sourceMeta.sourceType,sourceFromConfig(sourceId,"sourceType"),"FEDERASYON"),
    sourceMeta, sport:normalizeId(post.sport || "other") || "other",
    section:normalizeId(post.section || "business_institution") || "business_institution",
    category,subCategory:normalizeId(post.subCategory || ""),
    title,summary,originalTitle:firstString(editorial.originalTitle,post.originalTitle,post.title),
    originalText:firstString(editorial.originalText,post.originalText,post.summary),
    editorial,editorialLabel:firstString(editorial.label,post.editorialLabel,"SporNRD Özeti"),
    image:isSafeUrl(image) ? image : "", url:isSafeUrl(sourceUrl) ? sourceUrl : "",
    detailUrl:isSafeUrl(detailUrl) ? detailUrl : "",pdfUrl:isSafeUrl(pdfUrl) ? pdfUrl : "",
    locationMeta,location:locationText,city:extractPostCity(post,locationMeta,locationText),date:buildPostDate(post),
    actionLabel:firstString(findActionLabel(post.actions,"detail"),category === "course" ? "Kurs Detayları" : "Detay"),
    verified:typeof post.verified === "boolean" ? post.verified : (typeof sourceMeta.verified === "boolean" ? sourceMeta.verified : (typeof sourceVerified === "boolean" ? sourceVerified : post?.trust?.verified === true)),
    emoji:firstString(post?.display?.emoji,post.emoji),
    selectionScore:safeNumberOrNull(post.selectionScore),
    rankingScore:safeNumberOrNull(post.rankingScore ?? post?.rankingMeta?.score),
    selected:typeof post.selected === "boolean" ? post.selected : normalizeId(post?.selectionMeta?.decision) === "selected"
  };
}

/* YEREL DURUM, CACHE, API */
function removeLegacyCaches() {
  try { OLD_CACHE_KEYS.forEach(key => localStorage.removeItem(key)); } catch { /* storage erişimi yok */ }
}
function loadInteractions() {
  try { const saved = JSON.parse(localStorage.getItem(INTERACTION_KEY) || "{}"); state.interactions = isPlainObject(saved) ? saved : {}; }
  catch { state.interactions = {}; }
}
function saveInteractions() {
  try { localStorage.setItem(INTERACTION_KEY,JSON.stringify(state.interactions)); } catch { /* hata akışı durdurmaz */ }
}
function getInteraction(postId) {
  const previous = state.interactions[postId];
  state.interactions[postId] = {
    ...(isPlainObject(previous) ? previous : {}),
    wow:previous?.wow === true,saved:previous?.saved === true,trash:previous?.trash === true
  };
  return state.interactions[postId];
}
function normalizeFilterState(value) {
  const o = isPlainObject(value) ? value : {};
  const city = cleanString(o.city), sport = cleanString(o.sport), category = cleanString(o.category), sub = cleanString(o.subCategory);
  return {
    city:!city || normalizeId(city) === "all" ? "all" : canonicalCityName(city),
    sport:!sport || normalizeId(sport) === "all" ? "all" : normalizeId(sport),
    category:!category || normalizeId(category) === "all" ? "all" : normalizeId(category),
    subCategory:!sub || normalizeId(sub) === "all" ? "all" : normalizeId(sub)
  };
}
function loadFilters() {
  try { const saved = localStorage.getItem(FILTER_KEY); state.filters = saved ? normalizeFilterState(JSON.parse(saved)) : createDefaultFilters(); }
  catch { state.filters = createDefaultFilters(); }
  state.category = state.filters.category;
  state.draftFilters = {...state.filters};state.filterQueries = createDefaultFilterQueries();
}
function saveFilters() {
  try { localStorage.setItem(FILTER_KEY,JSON.stringify(state.filters)); } catch { /* isteğe bağlı */ }
}
function saveFeedCache() {
  try {
    localStorage.setItem(CACHE_KEY,JSON.stringify({
      version:APP_VERSION,posts:state.posts,lastUpdate:state.lastUpdate,sources:state.sources,
      feedVersion:state.feedVersion,selectionMode:state.selectionMode,summary:state.summary
    }));
  } catch { /* cache erişimi zorunlu değildir */ }
}
function loadCachedFeed() {
  try {
    const raw = localStorage.getItem(CACHE_KEY); if (!raw) return;
    const data = JSON.parse(raw);
    state.posts = Array.isArray(data.posts) ? data.posts.map(normalizePreviewPost).filter(Boolean) : [];
    state.lastUpdate = data.lastUpdate || null;
    state.sources = Array.isArray(data.sources) ? data.sources : [];
    state.feedVersion = data.feedVersion || null; state.selectionMode = data.selectionMode || null;
    state.summary = isPlainObject(data.summary) ? data.summary : null;
    sanitizeAppliedFilters(); renderFeed(); renderSources(); renderSourceStats();
    renderActiveFilterBar(); syncCategoryButtons(); updateSubtitle();
  } catch (error) { console.warn("SporNRD cache:",error); }
}
function getDefaultLimit() {
  const value = Number(window.SPORNRD_CONFIG?.api?.defaultLimit);
  const max = Number(window.SPORNRD_CONFIG?.api?.maxLimit);
  const safeMax = Number.isFinite(max) && max > 0 ? max : 30;
  return !Number.isFinite(value) || value <= 0 ? Math.min(20,safeMax) : Math.max(1,Math.min(value,safeMax));
}
function getRequestTimeout() {
  const timeout = Number(window.SPORNRD_CONFIG?.api?.timeout);
  return Number.isFinite(timeout) && timeout >= 3000 ? timeout : 25000;
}
async function fetchMainFeedFromLegacyModule(limit) {
  const live = window.SPORNRD_LIVE_SOURCES;
  if (!live) throw new Error("SporNRD canlı kaynak modülü bulunamadı.");
  if (typeof live.getFeedPreview === "function") return live.getFeedPreview(limit);
  if (typeof live.getFeed === "function") return live.getFeed(limit);
  if (typeof live.getMainFeed === "function") return live.getMainFeed(limit);
  throw new Error("SporNRD birleşik feed fonksiyonu bulunamadı.");
}
async function fetchMainFeed(limit) {
  const config = window.SPORNRD_CONFIG?.api || {};
  const baseUrl = String(config.baseUrl || "").trim().replace(/\/+$/, "");
  const endpoint = String(config.feedEndpoint || config.feedPreviewEndpoint || "/api/feed-preview").trim();
  if (!baseUrl) return fetchMainFeedFromLegacyModule(limit);
  const url = new URL(baseUrl + (endpoint.startsWith("/") ? endpoint : "/"+endpoint));
  url.searchParams.set("limit",String(limit));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),getRequestTimeout());
  try {
    const response = await fetch(url.toString(),{
      method:"GET",headers:{Accept:"application/json"},signal:controller.signal,cache:"no-store"
    });
    if (!response.ok) {
      let detail = "";
      try { const errorBody = await response.json(); detail = errorBody?.detail || errorBody?.error || ""; } catch { /* JSON değil */ }
      throw new Error(detail || `SporNRD sunucusu ${response.status} hatası döndürdü.`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("SporNRD isteği zaman aşımına uğradı.");
    throw error;
  } finally { clearTimeout(timer); }
}
async function loadLiveFeed(manualRefresh=false) {
  if (manualRefresh || state.posts.length === 0) showLoading();
  try {
    const data = await fetchMainFeed(getDefaultLimit());
    if (!data || data.ok !== true) throw new Error("SporNRD canlı akışı geçerli cevap vermedi.");
    if (!Array.isArray(data.items)) throw new Error("SporNRD içerik listesi geçersiz.");
    state.posts = data.items.map(normalizePreviewPost).filter(Boolean);
    state.sources = Array.isArray(data.sources) ? data.sources : [];
    state.lastUpdate = data.finishedAt || data.fetchedAt || new Date().toISOString();
    state.feedVersion = data.version || null;state.selectionMode = data.selectionMode || null;
    state.summary = isPlainObject(data.summary) ? data.summary : null;
    sanitizeAppliedFilters();saveFeedCache();hideStatus();syncCategoryButtons();
    updateSubtitle();renderActiveFilterBar();renderFeed();renderSources();renderSourceStats();
    if (state.currentPage === "sourceProfilePage") renderSourceProfile();
    if (document.getElementById("filterModal")?.classList.contains("open")) {
      state.draftFilters = {...state.filters};state.filterQueries = createDefaultFilterQueries();renderFilterPanel();
    }
    if (manualRefresh) showToast(`Akış güncellendi · ${state.posts.length} seçilmiş içerik`);
  } catch (error) {
    console.error("SporNRD feed:",error);
    if (state.posts.length > 0) { showStatus("Canlı kaynaklara ulaşılamadı. Son başarılı veriler gösteriliyor.",false);renderFeed(); }
    else { showStatus(error?.message || "Gerçek spor verileri alınamadı.",true);showEmptyFeed(); }
  }
}
function startAutomaticRefresh() {
  const n = Number(window.SPORNRD_CONFIG?.sourceRefreshMinutes || 5);
  const minutes = Number.isFinite(n) ? Math.max(1,n) : 5;
  setInterval(() => loadLiveFeed(false),minutes*60*1000);
}
function showLoading() {
  if (!feedContainer) return;
  feedContainer.innerHTML = `<div class="empty-state"><div class="loading-spinner"></div>
    <strong>SporNRD kaynakları kontrol ediyor</strong><p>TYF ve TBF içerikleri SporNRD çekirdeğinde analiz ediliyor.</p></div>`;
}
function showEmptyFeed() {
  if (feedContainer) feedContainer.innerHTML = `<div class="empty-state"><strong>İçerik bulunamadı</strong><p>Canlı kaynaklar şu anda seçilmiş içerik döndürmedi.</p></div>`;
}
function showStatus(message,error) {
  if (!statusBox) return;statusBox.textContent=message;
  statusBox.classList.remove("hidden");statusBox.classList.toggle("error",Boolean(error));
}
function hideStatus() { statusBox?.classList.add("hidden"); }
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast"); if (!toast) return;
  toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);
  toastTimer=setTimeout(() => toast.classList.remove("show"),1700);
}

/* SIRALAMA: ÖNCE BACKEND, SONRA YEREL ÖĞRENME */
function compareBackendRank(a,b) {
  const rankA=safeNumberOrNull(a?.rankingScore),rankB=safeNumberOrNull(b?.rankingScore);
  if (rankA !== null || rankB !== null) {
    const diff=(rankB ?? -1)-(rankA ?? -1);if (diff !== 0) return diff;
  }
  const selectionDiff=(safeNumberOrNull(b?.selectionScore) ?? 0)-(safeNumberOrNull(a?.selectionScore) ?? 0);
  return selectionDiff !== 0 ? selectionDiff : getPostTimestamp(b)-getPostTimestamp(a);
}
function rankPosts(posts) {
  const list=Array.isArray(posts) ? [...posts] : [];list.sort(compareBackendRank);
  const learning=window.SPORNRD_LEARNING;
  if (window.SPORNRD_CONFIG?.learning?.enabled !== false && typeof learning?.rank === "function") {
    try { const ranked=learning.rank(list);if (Array.isArray(ranked)) return ranked; }
    catch(error) { console.warn("SporNRD learning rank:",error); }
  }
  return list;
}
function matchesFilters(post,filters) {
  const safe=normalizeFilterState(filters);
  if (safe.city !== "all" && normalizeText(post.city) !== normalizeText(safe.city)) return false;
  if (safe.sport !== "all" && normalizeId(post.sport) !== normalizeId(safe.sport)) return false;
  if (safe.category !== "all" && normalizeId(post.category) !== normalizeId(safe.category)) return false;
  if (safe.subCategory !== "all" && normalizeId(post.subCategory) !== normalizeId(safe.subCategory)) return false;
  return true;
}
function matchesActiveFilter(post) { return matchesFilters(post,state.filters); }
function getVisiblePosts(filters) {
  return state.posts.filter(post => !getInteraction(post.id).trash && matchesFilters(post,filters));
}
function renderFeed() {
  if (!feedContainer) return;
  const posts=rankPosts(state.posts).filter(matchesActiveFilter).filter(p => !getInteraction(p.id).trash);
  if (!posts.length) {
    feedContainer.innerHTML=`<div class="empty-state"><strong>Bu filtrelerde içerik yok</strong>
      <p>Filtreleri değiştirebilir veya akışı yenileyebilirsin.</p></div>`;
    return;
  }
  feedContainer.innerHTML=posts.map(createPostCard).join("");
}

/* DÖRT ALANLI FİLTRE (6.1.6) */
function getAvailableCities() { return [...TURKEY_CITIES].sort((a,b) => a.localeCompare(b,"tr")); }
function getAvailableSports() {
  const map=new Map();
  const configured=Array.isArray(window.SPORNRD_CONFIG?.sports) ? window.SPORNRD_CONFIG.sports : [];
  for (const item of configured) {
    const id=normalizeId(item?.id);if (!id || id === "all") continue;
    map.set(id,{id,label:cleanString(item?.label) || sportNameFromId(id)});
  }
  for (const post of state.posts) {
    const id=normalizeId(post.sport);if (!id || id === "other" || map.has(id)) continue;
    map.set(id,{id,label:getSportName(post)});
  }
  return [...map.values()].sort((a,b) => a.label.localeCompare(b.label,"tr"));
}
function getAvailableSportIds() { return getAvailableSports().map(i => i.id); }
function getAvailableCategories() {
  const order=["news","course","event","campaign","jobs","stores"];
  const configured=Array.isArray(window.SPORNRD_CONFIG?.categories) ? window.SPORNRD_CONFIG.categories : [];
  const map=new Map(configured.map(item => [normalizeId(item?.id),cleanString(item?.label)]));
  return order.map(id => ({id,label:map.get(id) || titleCaseTurkish(categoryName(id))}));
}
function getAvailableCategoryIds() { return getAvailableCategories().map(i => i.id); }
function getAvailableSubCategoryIds(filters) {
  const safe=normalizeFilterState(filters);
  const context={city:safe.city,sport:safe.sport,category:safe.category,subCategory:"all"};
  const ids=new Set();
  state.posts.filter(post => matchesFilters(post,context)).forEach(post => {
    const id=normalizeId(post.subCategory);if (id) ids.add(id);
  });
  return [...ids].sort((a,b) => (subCategoryName(a)||titleFromId(a)).localeCompare(subCategoryName(b)||titleFromId(b),"tr"));
}
function sanitizeAppliedFilters() {
  if (!["all",...getAvailableSportIds()].includes(state.filters.sport)) state.filters.sport="all";
  if (!["all",...getAvailableCategoryIds()].includes(state.filters.category)) state.filters.category="all";
  if (state.filters.city !== "all") {
    const city=canonicalCityName(state.filters.city);
    state.filters.city=TURKEY_CITIES.some(c => normalizeText(c) === normalizeText(city)) ? city : "all";
  }
  if (state.filters.subCategory !== "all" && !getAvailableSubCategoryIds({...state.filters,subCategory:"all"}).includes(state.filters.subCategory)) state.filters.subCategory="all";
  state.category=state.filters.category;state.draftFilters={...state.filters};saveFilters();
}
function getFilterInput(type) {
  return document.getElementById(({city:"filterCityInput",sport:"filterSportInput",category:"filterCategoryInput",subCategory:"filterSubCategoryInput"})[type] || "");
}
function getFilterDropdown(type) {
  return document.getElementById(({city:"filterCityDropdown",sport:"filterSportDropdown",category:"filterCategoryDropdown",subCategory:"filterSubCategoryDropdown"})[type] || "");
}
function getFilterOptionsContainer(type) {
  return document.getElementById(({city:"filterCityOptions",sport:"filterSportOptions",category:"filterCategoryOptions",subCategory:"filterSubCategoryOptions"})[type] || "");
}
function filterCityLabel(value) { return value === "all" ? "Tümü" : canonicalCityName(value) || cleanString(value); }
function filterSportLabel(value) { return value === "all" ? "Tümü" : sportNameFromId(value); }
function filterCategoryLabel(value) { return value === "all" ? "Tümü" : titleCaseTurkish(categoryName(value)); }
function filterSubCategoryLabel(value) { return value === "all" ? "Tümü" : subCategoryName(value) || titleFromId(value); }
function getFilterValueLabel(type,value) {
  if (!value || value === "all") return "";
  return ({city:filterCityLabel,sport:filterSportLabel,category:filterCategoryLabel,subCategory:filterSubCategoryLabel})[type]?.(value) || cleanString(value);
}
function syncSingleFilterInput(type) {
  const input=getFilterInput(type);if (input) input.value=getFilterValueLabel(type,state.draftFilters[type]);
}
function syncFilterInputsFromDraft() { FILTER_TYPES.forEach(syncSingleFilterInput); }
function getFilterOptions(type) {
  let options=[];
  if (type === "city") options=getAvailableCities().map(city => ({value:city,label:city}));
  else if (type === "sport") options=getAvailableSports().map(i => ({value:i.id,label:i.label}));
  else if (type === "category") options=getAvailableCategories().map(i => ({value:i.id,label:i.label}));
  else if (type === "subCategory") options=getAvailableSubCategoryIds({...state.draftFilters,subCategory:"all"})
    .map(id => ({value:id,label:subCategoryName(id) || titleFromId(id)}));
  return [{value:"all",label:"Tümü"},...options];
}
function isFilterOptionActive(type,value) {
  return type === "city" ? normalizeText(state.draftFilters[type]) === normalizeText(value)
    : normalizeId(state.draftFilters[type]) === normalizeId(value);
}
function createFilterOption({type,value,label,active}) {
  return `<button class="filter-dropdown-option ${active ? "active" : ""}"
    data-filter-type="${escapeHtml(type)}" data-filter-value="${escapeHtml(value)}" type="button">${escapeHtml(label)}</button>`;
}
function renderFilterOptions(type) {
  const container=getFilterOptionsContainer(type);if (!container) return;
  const query=normalizeText(state.filterQueries[type] || "");
  const options=getFilterOptions(type).filter(o => !query || normalizeText(`${o.label} ${o.value}`).includes(query));
  container.innerHTML=options.length ? options.map(o => createFilterOption({type,...o,active:isFilterOptionActive(type,o.value)})).join("")
    : `<div class="filter-option-empty">Sonuç bulunamadı</div>`;
}
function renderFilterResultCount() {
  const el=document.getElementById("filterResultCount");if (el) el.textContent=`${getVisiblePosts(state.draftFilters).length} içerik`;
}
function renderFilterPanel() { syncFilterInputsFromDraft();FILTER_TYPES.forEach(renderFilterOptions);renderFilterResultCount(); }
function closeFilterDropdown(type) {
  getFilterDropdown(type)?.classList.add("hidden");
  document.querySelector(`[data-filter-box="${type}"]`)?.classList.remove("open");
  document.querySelector(`[data-filter-toggle="${type}"]`)?.setAttribute("aria-expanded","false");
}
function closeAllFilterDropdowns(exceptType="") { FILTER_TYPES.forEach(t => { if (t !== exceptType) closeFilterDropdown(t); }); }
function openFilterDropdown(type) {
  if (!FILTER_TYPES.includes(type)) return;
  closeAllFilterDropdowns(type);getFilterDropdown(type)?.classList.remove("hidden");
  document.querySelector(`[data-filter-box="${type}"]`)?.classList.add("open");
  document.querySelector(`[data-filter-toggle="${type}"]`)?.setAttribute("aria-expanded","true");
}
function isFilterDropdownOpen(type) { const d=getFilterDropdown(type);return Boolean(d && !d.classList.contains("hidden")); }
function toggleFilterDropdown(type) {
  if (isFilterDropdownOpen(type)) { closeFilterDropdown(type);return; }
  state.filterQueries[type]="";renderFilterOptions(type);openFilterDropdown(type);
  const input=getFilterInput(type);if (input) { input.focus();try {input.select();} catch {/* desteklenmeyebilir */} }
}
function ensureDraftSubCategoryIsAvailable() {
  if (state.draftFilters.subCategory === "all") return;
  if (!getAvailableSubCategoryIds({...state.draftFilters,subCategory:"all"}).includes(state.draftFilters.subCategory)) state.draftFilters.subCategory="all";
}
function handleFilterChoice(type,value) {
  if (!FILTER_TYPES.includes(type)) return;
  const raw=cleanString(value) || "all";
  state.draftFilters[type]=type === "city"
    ? (normalizeId(raw) === "all" ? "all" : canonicalCityName(raw)) : normalizeId(raw) || "all";
  if (type === "category") state.draftFilters.subCategory="all";
  if (["city","sport","category"].includes(type)) ensureDraftSubCategoryIsAvailable();
  state.filterQueries=createDefaultFilterQueries();closeAllFilterDropdowns();renderFilterPanel();
}
function handleFilterInput(type,value) {
  if (!FILTER_TYPES.includes(type)) return;
  state.filterQueries[type]=cleanString(value);openFilterDropdown(type);renderFilterOptions(type);
}
function chooseFirstVisibleFilterOption(type) {
  const el=getFilterOptionsContainer(type)?.querySelector("[data-filter-type][data-filter-value]");
  if (!el) return false;handleFilterChoice(el.dataset.filterType,el.dataset.filterValue);return true;
}
function findExactFilterValue(type,text) {
  const n=normalizeText(text);if (!n) return null;
  return getFilterOptions(type).find(o => normalizeText(o.label) === n || normalizeText(o.value) === n)?.value ?? null;
}
function commitExactTypedFilters() {
  for (const type of FILTER_TYPES) {
    const input=getFilterInput(type),typed=cleanString(input?.value);if (!typed) continue;
    const exact=findExactFilterValue(type,typed);if (exact === null) continue;
    state.draftFilters[type]=type === "city" ? (exact === "all" ? "all" : canonicalCityName(exact)) : normalizeId(exact) || "all";
    if (type === "category") ensureDraftSubCategoryIsAvailable();
  }
}
function openFilter() {
  state.draftFilters={...state.filters};state.filterQueries=createDefaultFilterQueries();
  closeAllFilterDropdowns();renderFilterPanel();openModal("filterModal");
}
function applyDraftFilters() {
  commitExactTypedFilters();ensureDraftSubCategoryIsAvailable();state.filters=normalizeFilterState(state.draftFilters);
  state.category=state.filters.category;state.filterQueries=createDefaultFilterQueries();saveFilters();
  syncCategoryButtons();updateSubtitle();renderActiveFilterBar();renderFeed();
  closeAllFilterDropdowns();closeModal("filterModal");
  showToast(`${getVisiblePosts(state.filters).length} içerik gösteriliyor`);
}
function clearDraftFilters() {
  state.draftFilters=createDefaultFilters();state.filterQueries=createDefaultFilterQueries();
  closeAllFilterDropdowns();renderFilterPanel();
}
function clearActiveFilters() {
  state.filters=createDefaultFilters();state.draftFilters=createDefaultFilters();state.filterQueries=createDefaultFilterQueries();
  state.category="all";saveFilters();syncCategoryButtons();updateSubtitle();renderActiveFilterBar();renderFeed();
  showToast("Filtreler temizlendi");
}
function renderActiveFilterBar() {
  const bar=document.getElementById("activeFilterBar"),summary=document.getElementById("activeFilterSummary");
  if (!bar || !summary) return;
  const labels=[];
  for (const type of FILTER_TYPES) if (state.filters[type] !== "all") labels.push(getFilterValueLabel(type,state.filters[type]));
  if (!labels.length) {bar.classList.add("hidden");summary.textContent="Tüm içerikler";return;}
  summary.textContent=labels.join(" · ");bar.classList.remove("hidden");
}
function syncCategoryButtons() {
  const category=normalizeId(state.filters.category || "all") || "all";
  document.querySelectorAll(".category-item").forEach(button => {
    button.classList.toggle("active",(normalizeId(button.dataset.category || "all") || "all") === category);
  });
}
function applyTopCategory(category) {
  const next=normalizeId(category || "all") || "all";
  state.filters.category=next;state.filters.subCategory="all";state.draftFilters={...state.filters};
  state.filterQueries=createDefaultFilterQueries();state.category=next;saveFilters();
  syncCategoryButtons();updateSubtitle();renderActiveFilterBar();renderFeed();
}
function updateSubtitle() {
  const text={all:"Resmî spor kaynaklarından seçilmiş ve sıralanmış içerikler",
    news:"Sonuç, başarı, transfer ve önemli spor haberleri",course:"Kurs, eğitim ve meslekî gelişim fırsatları",
    event:"Yaklaşan müsabaka, şampiyona ve spor etkinlikleri",campaign:"Spor kampanyaları ve kullanıcı avantajları",
    jobs:"Spor sektöründeki iş ve istihdam fırsatları",stores:"Spor ürünleri ve mağaza içerikleri"};
  const subtitle=document.getElementById("feedSubtitle");if (!subtitle) return;
  const category=normalizeId(state.filters.category || "all") || "all";
  const prefix=[];
  if (state.filters.city !== "all") prefix.push(filterCityLabel(state.filters.city));
  if (state.filters.sport !== "all") prefix.push(filterSportLabel(state.filters.sport));
  subtitle.textContent=prefix.length ? `${prefix.join(" · ")} · ${text[category] || text.all}` : text[category] || text.all;
}

/* POST GÖRÜNÜMÜ - HIZLI REAKSİYON YOKTUR */
function buildDisplayTags(post) {
  const tags=[getSportName(post),categoryName(post.category)];
  const sub=subCategoryName(post.subCategory);if (sub) tags.push(sub);
  if (Array.isArray(post.tags)) tags.push(...post.tags.slice(0,3));
  return [...new Set(tags.map(cleanString).filter(Boolean))].slice(0,5);
}
function buildDebugTags(post) {
  const config=window.SPORNRD_CONFIG?.preview || {},tags=[];
  if (config.showSelectionDebug === true && safeNumberOrNull(post.selectionScore) !== null)
    tags.push(`<span class="post-tag">Seçim ${escapeHtml(formatScore(post.selectionScore))}</span>`);
  if (config.showRankingDebug === true && safeNumberOrNull(post.rankingScore) !== null)
    tags.push(`<span class="post-tag">Sıra ${escapeHtml(formatScore(post.rankingScore))}</span>`);
  if (config.showTemporalDebug === true && post?.temporal?.state)
    tags.push(`<span class="post-tag">${escapeHtml(post.temporal.state)}</span>`);
  return tags.join("");
}
function fallbackMedia(post) {
  return `<div class="fallback-media"><span>${escapeHtml(getPostEmoji(post))}</span>
    <strong>${escapeHtml(post.title || "SporNRD")}</strong></div>`;
}
function sourceAvatarContent(source,post) {
  const shortName=escapeHtml(source?.shortName || getSourceShortName(post));
  const url=firstString(source?.logoUrl,post?.sourceMeta?.logoUrl,post?.sourceMeta?.logo);
  // Resim yüklenemezse gerçek olmayan logo yerine kısa ad görünür.
  return isSafeUrl(url)
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(source?.name || getSourceName(post))} logosu"
         loading="lazy" referrerpolicy="no-referrer"
         onerror="this.style.display='none';this.nextElementSibling.hidden=false">
       <span hidden>${shortName}</span>`
    : shortName;
}
function createPostCard(post) {
  const interaction=getInteraction(post.id);
  const sourceProfile=getSourceProfileById(post.sourceId,post);
  const sourceName=escapeHtml(getSourceName(post));
  const sourceId=escapeHtml(sourceProfile?.id || post.sourceId || "");
  const sourceType=escapeHtml(sourceProfile?.sourceType || post.sourceType || "FEDERASYON");
  const sport=escapeHtml(getSportName(post));
  const title=escapeHtml(post.title || "Spor duyurusu");
  const summary=escapeHtml(truncateText(post.summary || "",420));
  const location=escapeHtml(post.location || "Türkiye");
  const date=escapeHtml(post.date || "");
  const category=escapeHtml(categoryName(post.category));
  const intent=escapeHtml(intentName(post.contentIntent));
  const emoji=escapeHtml(getPostEmoji(post));
  const officeCity=cleanString(sourceProfile?.city);
  const imageHtml=post.image ? `
      <img src="${escapeHtml(post.image)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer"
           onerror="this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='flex'}">
      <div class="fallback-media fallback-hidden"><span>${emoji}</span><strong>${title}</strong></div>` : fallbackMedia(post);
  const tags=buildDisplayTags(post).map(tag => `<span class="post-tag">#${escapeHtml(tag)}</span>`).join("");
  const canOpenProfile=Boolean(sourceId);
  const accountName=canOpenProfile ?
    `<button class="post-source-button account-name" data-source-profile="${sourceId}" type="button">${sourceName}</button>` :
    `<span class="account-name">${sourceName}</span>`;
  const avatar=canOpenProfile ?
    `<button class="post-avatar post-source-button post-source-avatar" data-source-profile="${sourceId}"
       aria-label="${sourceName} profilini aç" type="button">${sourceAvatarContent(sourceProfile,post)}</button>` :
    `<div class="post-avatar">${escapeHtml(getSourceShortName(post))}</div>`;
  return `
  <article class="post-card" data-source-id="${escapeHtml(post.sourceId || "")}" data-category="${escapeHtml(post.category || "")}" data-sport="${escapeHtml(post.sport || "")}" data-city="${escapeHtml(post.city || "")}">
    <div class="post-top">
      ${avatar}
      <div class="post-account">
        <div class="account-row">
          ${accountName}
          ${post.verified !== false ? `<span class="verified" aria-label="Doğrulanmış kaynak">✓</span>` : ""}
          <span class="source-badge">${sourceType}</span>
          <span class="category-badge">${category}</span>
          ${post.editorial && Object.keys(post.editorial).length ? `<span class="editorial-badge">SporNRD Özeti</span>` : ""}
        </div>
        <div class="post-sub-info">${sourceType} · ${sport}${officeCity ? ` · ${escapeHtml(officeCity)}` : ""}</div>
        ${post.city || date ? `<div class="post-sub-info">${post.city ? `İçerik ili: ${escapeHtml(post.city)}` : ""}${post.city && date ? " · " : ""}${date}</div>` : ""}
      </div>
    </div>
    <div class="post-media">${imageHtml}</div>
    <div class="post-body">
      <h2 class="post-title">${title}</h2>
      ${summary ? `<p class="post-description">${summary}</p>` : ""}
      <div class="post-tags">${tags}${location ? `<span class="post-tag">📍 ${location}</span>` : ""}${intent ? `<span class="post-tag">${intent}</span>` : ""}${buildDebugTags(post)}</div>
    </div>
    <div class="post-buttons">
      <button class="post-button primary" data-detail-id="${escapeHtml(post.id)}" type="button">${escapeHtml(post.actionLabel || "Detay")}</button>
      <button class="post-button" data-source-url="${escapeHtml(post.url || "")}" data-post-id="${escapeHtml(post.id)}" type="button" ${post.url ? "" : "disabled"}>Kaynağa Git</button>
    </div>
    <div class="post-action-row">
      <button class="post-action-button ${interaction.wow ? "wow-active" : ""}" data-action="wow" data-post-id="${escapeHtml(post.id)}" type="button"><span>🤩</span><span>Woow</span></button>
      <button class="post-action-button" data-action="trash" data-post-id="${escapeHtml(post.id)}" type="button"><span>🗑️</span><span>Çöp</span></button>
      <button class="post-action-button ${interaction.saved ? "save-active" : ""}" data-action="save" data-post-id="${escapeHtml(post.id)}" type="button"><span>🔖</span><span>Kaydet</span></button>
      <button class="post-action-button" data-action="share" data-post-id="${escapeHtml(post.id)}" type="button"><span>↗</span><span>Paylaş</span></button>
    </div>
  </article>`;
}

/* ETKİLEŞİMLER / LEARNING */
function recordLearning(post,action,extra={}) {
  try {
    if (typeof window.SPORNRD_LEARNING?.learn === "function") window.SPORNRD_LEARNING.learn(post,action,extra);
  } catch(error) { console.warn("Yerel learning:",error); }
  const live=window.SPORNRD_LIVE_SOURCES;
  if (!live || typeof live.sendFeedback !== "function") return;
  Promise.resolve(live.sendFeedback({
    postId:post.id,sourceId:post.sourceId || "",
    source:post.sourceId || post.sourceShortName || post.source || "unknown",
    sourceName:post.sourceName || post.source || "",sport:post.sport || "",
    category:post.category || "news",section:post.section || "",
    contentIntent:post.contentIntent || "",action,timestamp:new Date().toISOString(),...extra
  })).catch(error => console.warn("Feedback:",error));
}
async function sharePost(post) {
  try {
    if (navigator.share) {
      await navigator.share({title:post.title || "SporNRD",text:post.summary || "",url:post.url || ""});return;
    }
    if (navigator.clipboard && post.url) {await navigator.clipboard.writeText(post.url);showToast("Haber bağlantısı kopyalandı.");return;}
    if (post.url) openSafeUrl(post.url);
  } catch { /* kullanıcı paylaşımı iptal edebilir */ }
}
async function handleAction(action,postId) {
  const post=findPost(postId);if (!post) return;
  const interaction=getInteraction(postId);
  if (action === "wow") {
    interaction.wow=!interaction.wow;if (interaction.wow) recordLearning(post,"wow");
    showToast(interaction.wow ? "Woow 🤩" : "Woow kaldırıldı");
  }
  if (action === "save") {
    interaction.saved=!interaction.saved;if (interaction.saved) recordLearning(post,"save");
    showToast(interaction.saved ? "Kaydedildi 🔖" : "Kaydetme kaldırıldı");
  }
  if (action === "trash") {interaction.trash=true;recordLearning(post,"trash");showToast("Bu içerik akışından kaldırıldı.");}
  if (action === "share") {await sharePost(post);recordLearning(post,"share");}
  saveInteractions();renderFeed();
  if (state.currentPage === "sourceProfilePage") renderSourceProfile();
  if (document.getElementById("filterModal")?.classList.contains("open")) renderFilterResultCount();
}

/* KURUM PROFİLİ: TAKİP / YORUM / PUAN (YEREL) */
function loadSourceEngagement() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOURCE_ENGAGEMENT_KEY) || "{}");
    sourceEngagement = isPlainObject(saved) ? saved : {};
  } catch {
    sourceEngagement = {};
  }
}
function saveSourceEngagement() {
  try {
    localStorage.setItem(SOURCE_ENGAGEMENT_KEY, JSON.stringify(sourceEngagement));
    return true;
  } catch {
    showToast("Kayıt bu cihazda saklanamadı.");
    return false;
  }
}
function getSourceEngagement(sourceId) {
  const id=normalizeId(sourceId);
  if (!id) return { following:false, comments:[], rating:0 };
  const existing=isPlainObject(sourceEngagement[id]) ? sourceEngagement[id] : {};
  const comments=Array.isArray(existing.comments) ? existing.comments.filter(comment =>
    isPlainObject(comment) && cleanString(comment.text)
  ).slice(-100) : [];
  const rating=Number(existing.rating);
  const entry={
    following:existing.following === true,
    comments,
    rating:Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0
  };
  sourceEngagement[id]=entry;
  return entry;
}
function handleSourceFollow(sourceId) {
  const source=getSourceProfileById(sourceId);
  if (!source) return;
  const engagement=getSourceEngagement(source.id);
  engagement.following=!engagement.following;
  saveSourceEngagement();
  renderSourceProfile();
  showToast(engagement.following ? "Kaynak takip ediliyor" : "Takip bırakıldı");
}
function openSourceEngagementModal(sourceId,title,body) {
  const source=getSourceProfileById(sourceId);
  const heading=document.getElementById("sourceEngagementTitle");
  const subtitle=document.getElementById("sourceEngagementSubtitle");
  const container=document.getElementById("sourceEngagementBody");
  if (!source || !heading || !subtitle || !container) return;
  heading.textContent=title;
  subtitle.textContent=source.name;
  container.innerHTML=body;
  openModal("sourceEngagementModal");
}
function openSourceComments(sourceId) {
  const source=getSourceProfileById(sourceId);
  if (!source) return;
  const comments=getSourceEngagement(source.id).comments;
  const list=comments.length
    ? [...comments].reverse().map(comment => `<div class="source-comment-item">
        <div class="source-comment-author">Bu cihazdan · ${escapeHtml(formatHumanDate(comment.createdAt))}</div>
        <p>${escapeHtml(comment.text)}</p>
      </div>`).join("")
    : `<p class="source-engagement-empty">Henüz bu cihazdan yorum yapılmadı.</p>`;
  openSourceEngagementModal(source.id,"Yorumlar",`
    <p class="source-engagement-note">Yorumlar yalnızca bu cihazda saklanır.</p>
    <form class="source-comment-form" data-source-comment-form="${escapeHtml(source.id)}">
      <label for="sourceCommentInput">Yorumun</label>
      <textarea id="sourceCommentInput" name="comment" maxlength="500" rows="3"
        placeholder="Bu kaynakla ilgili yorumunu yaz..." required></textarea>
      <button type="submit">Yorum Ekle</button>
    </form>
    <div class="source-comment-list" aria-live="polite">${list}</div>
  `);
}
function saveSourceComment(form) {
  const sourceId=normalizeId(form?.dataset?.sourceCommentForm);
  const source=getSourceProfileById(sourceId);
  if (!source) return;
  const text=cleanString(form.querySelector('textarea[name="comment"]')?.value).slice(0,500);
  if (!text) { showToast("Lütfen yorum yaz.");return; }
  const engagement=getSourceEngagement(source.id);
  engagement.comments.push({text,createdAt:new Date().toISOString()});
  if (engagement.comments.length > 100) engagement.comments=engagement.comments.slice(-100);
  saveSourceEngagement();
  renderSourceProfile();
  openSourceComments(source.id);
  showToast("Yorumun bu cihaza kaydedildi.");
}
function openSourceRating(sourceId) {
  const source=getSourceProfileById(sourceId);
  if (!source) return;
  const rating=getSourceEngagement(source.id).rating;
  openSourceEngagementModal(source.id,"Puan Ver",`
    <p class="source-engagement-note">Bu kaynağa 1 ile 5 arasında puan ver. Puanın yalnızca bu cihazda saklanır.</p>
    <div class="source-rating-choices" role="group" aria-label="1 ile 5 arası puan">
      ${[1,2,3,4,5].map(value => `<button class="source-rating-choice ${rating === value ? "active" : ""}"
        data-source-rate="${escapeHtml(source.id)}" data-rating-value="${value}"
        type="button" aria-pressed="${rating === value}">${value} ★</button>`).join("")}
    </div>
    ${rating ? `<button class="source-rating-clear" data-source-rate="${escapeHtml(source.id)}"
      data-rating-value="0" type="button">Puanımı Kaldır</button>` : ""}
  `);
}
function handleSourceRating(sourceId,value) {
  const source=getSourceProfileById(sourceId);
  if (!source) return;
  const rating=Number(value);
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) return;
  getSourceEngagement(source.id).rating=rating;
  saveSourceEngagement();
  renderSourceProfile();
  closeModal("sourceEngagementModal");
  showToast(rating ? `${rating}/5 puan kaydedildi.` : "Puan kaldırıldı.");
}

/* KAYNAK PROFİL VERİLERİ - GENEL VE GENİŞLETİLEBİLİR */
function getSourceProfiles() {
  const map=new Map();
  const configured=isPlainObject(window.SPORNRD_CONFIG?.sources) ? window.SPORNRD_CONFIG.sources : {};
  const add=(source,fallbackId="") => {
    if (!source || typeof source !== "object") return;
    const id=normalizeId(firstString(source.id,fallbackId));if (!id) return;
    if (source.enabled === false) return;
    const existing=map.get(id) || {};
    const meta=isPlainObject(source.profile) ? source.profile : {};
    map.set(id,{
      ...existing,id,
      name:firstString(source.name,existing.name,titleFromId(id)),
      shortName:firstString(source.shortName,existing.shortName,id.toUpperCase()),
      sourceType:firstString(source.sourceType,source.type,existing.sourceType,"KAYNAK"),
      providerType:firstString(source.providerType,existing.providerType,""),
      sport:firstString(source.sport,existing.sport,""),
      sportLabel:firstString(source.sportLabel,existing.sportLabel,sportNameFromId(source.sport)),
      verified:typeof source.verified === "boolean" ? source.verified : Boolean(existing.verified),
      website:firstString(source.website,source.url,existing.website),
      city:firstString(meta.city,source.city,existing.city),
      district:firstString(meta.district,source.district,existing.district),
      address:firstString(meta.address,source.address,existing.address),
      country:firstString(meta.country,source.country,existing.country),
      description:firstString(meta.description,source.description,existing.description),
      contactUrl:firstString(meta.contactUrl,source.contactUrl,existing.contactUrl),
      email:firstString(meta.email,source.email,existing.email),
      phone:firstString(meta.phone,source.phone,existing.phone),
      logoUrl:isSafeUrl(firstString(meta.logoUrl,source.logoUrl,source.logo,existing.logoUrl))
        ? firstString(meta.logoUrl,source.logoUrl,source.logo,existing.logoUrl) : "",
      coverUrl:isSafeUrl(firstString(meta.coverUrl,source.coverUrl,existing.coverUrl))
        ? firstString(meta.coverUrl,source.coverUrl,existing.coverUrl) : "",
      socials:isPlainObject(meta.socials) ? meta.socials : (isPlainObject(source.socials) ? source.socials : existing.socials || {})
    });
  };
  // Dinamik kaynaklar önce, doğrulanmış config tanımları sonra uygulanır.
  for (const item of state.sources) {
    if (typeof item === "string") add({id:item,name:titleFromId(item)});
    else add(item);
  }
  for (const post of state.posts) {
    const id=normalizeId(post.sourceId);if (!id) continue;
    const previous=map.get(id);
    add({
      id,
      name:previous?.name || getSourceName(post),
      shortName:previous?.shortName || getSourceShortName(post),
      sourceType:previous?.sourceType || post.sourceType,
      sport:previous?.sport || post.sport,
      sportLabel:previous?.sportLabel || getSportName(post),
      verified:typeof previous?.verified === "boolean" ? previous.verified : post.verified === true,
      website:previous?.website || post?.sourceMeta?.website,
      logoUrl:previous?.logoUrl || post?.sourceMeta?.logoUrl || post?.sourceMeta?.logo
    });
  }
  for (const [id,source] of Object.entries(configured)) add(source,id);
  return [...map.values()].sort((a,b) => a.name.localeCompare(b.name,"tr"));
}
function getSourceProfileById(sourceId,post) {
  const id=normalizeId(sourceId);
  const existing=getSourceProfiles().find(s => s.id === id);
  if (existing) return existing;
  if (post) return {id:id || "",name:getSourceName(post),shortName:getSourceShortName(post),
    sourceType:post.sourceType,sport:post.sport,sportLabel:getSportName(post),
    verified:post.verified === true,city:"",description:"",website:"",logoUrl:"",coverUrl:""};
  return null;
}
function getSourcePosts(id) {
  const sourceId=normalizeId(id);
  return rankPosts(state.posts.filter(post => normalizeId(post.sourceId) === sourceId && !getInteraction(post.id).trash));
}
function renderSources() {
  const container=document.getElementById("sourceList");if (!container) return;
  const query=normalizeText(document.getElementById("sourceSearchInput")?.value || "");
  const sources=getSourceProfiles().filter(source => !query || normalizeText([
    source.name,source.shortName,source.sourceType,source.sportLabel,source.city
  ].join(" ")).includes(query));
  if (!sources.length) {container.innerHTML=`<div class="empty-state"><strong>Kaynak bulunamadı</strong></div>`;return;}
  container.innerHTML=sources.map(source => {
    const count=getSourcePosts(source.id).length;
    return `<button class="source-card source-card-button" data-source-profile="${escapeHtml(source.id)}" type="button">
      <div class="source-logo">${sourceAvatarContent(source,{sourceShortName:source.shortName,sourceName:source.name})}</div>
      <div class="source-info"><div class="source-name-row">
        <strong>${escapeHtml(source.name)}</strong>${source.verified ? `<span class="verified" aria-label="Doğrulanmış kaynak">✓</span>` : ""}
      </div><span>${escapeHtml(source.sourceType)} · ${escapeHtml(source.sportLabel)}${source.city ? ` · ${escapeHtml(source.city)}` : ""}</span>
      ${source.description ? `<p>${escapeHtml(source.description)}</p>` : ""}
      <p>Akışta ${count} içerik · Profili görüntüle →</p></div></button>`;
  }).join("");
}
function renderSourceStats() {
  const count=document.getElementById("sourcePostCount"),update=document.getElementById("sourceLastUpdate");
  if (count) count.textContent=String(state.posts.length);
  if (update) update.textContent=formatTime(state.lastUpdate);
}
function createProfileUrl(sourceId) {
  const url=new URL(window.location.href);
  url.searchParams.set("source",sourceId);url.hash="";
  return url.toString();
}
function openSourceProfile(sourceId) {
  const profile=getSourceProfileById(sourceId);
  if (!profile) {showToast("Kaynak profili bulunamadı.");return;}
  if (state.currentPage !== "sourceProfilePage") {
    state.profile.returnPage=state.currentPage;state.profile.returnScroll=window.scrollY || 0;
  }
  state.profile.sourceId=profile.id;state.profile.tab="posts";state.profile.category="all";
  renderSourceProfile();switchPage("sourceProfilePage");
}
function closeSourceProfile() {
  const previous=state.profile.returnPage === "sourceProfilePage" ? "sourcesPage" : state.profile.returnPage;
  switchPage(previous || "sourcesPage");
  window.scrollTo(0,state.profile.returnScroll || 0);
}
function getProfileSocialLinks(source) {
  const links=[];const socials=isPlainObject(source.socials) ? source.socials : {};
  for (const [platform,url] of Object.entries(socials)) {
    if (isSafeUrl(url)) links.push({label:titleFromId(platform),url});
  }
  return links;
}
function renderSourceProfile() {
  const source=getSourceProfileById(state.profile.sourceId);if (!source) return;
  const header=document.getElementById("sourceProfileHeader");
  const content=document.getElementById("sourceProfileContent");
  const chips=document.getElementById("sourceProfileCategoryFilters");
  if (!header || !content || !chips) return;
  const posts=getSourcePosts(source.id);
  const engagement=getSourceEngagement(source.id);
  const cover=source.coverUrl ? `<img src="${escapeHtml(source.coverUrl)}" alt="" loading="lazy">` : "";
  header.innerHTML=`<div class="source-profile-cover">${cover}</div>
    <div class="source-profile-identity">
      <div class="source-profile-main">
        <div class="source-profile-avatar">${sourceAvatarContent(source,{sourceShortName:source.shortName,sourceName:source.name})}</div>
        <div class="source-profile-name"><h1>${escapeHtml(source.name)}</h1>
          <div class="source-profile-labels">${escapeHtml(source.sourceType)}${source.sportLabel ? ` · ${escapeHtml(source.sportLabel)}` : ""}${source.city ? ` · ${escapeHtml(source.city)}` : ""}</div>
          ${source.verified ? `<div class="source-profile-trust">✓ Doğrulanmış kaynak</div>` : ""}
        </div>
      </div>
      ${source.description ? `<p class="source-profile-description">${escapeHtml(source.description)}</p>` : ""}
      <div class="source-profile-stats" aria-label="Kaynak etkileşimleri">
        <button class="source-profile-stat source-profile-social-button ${engagement.following ? "active" : ""}"
          data-source-follow="${escapeHtml(source.id)}" type="button"
          aria-pressed="${engagement.following}">
          <strong>${engagement.following ? 1 : 0}</strong><span>Takip</span>
        </button>
        <button class="source-profile-stat source-profile-social-button"
          data-source-comments="${escapeHtml(source.id)}" type="button">
          <strong>${engagement.comments.length}</strong><span>Yorum</span>
        </button>
        <button class="source-profile-stat source-profile-social-button ${engagement.rating ? "rated" : ""}"
          data-source-rating="${escapeHtml(source.id)}" type="button">
          <strong>${engagement.rating}</strong><span>Puan</span>
        </button>
      </div>
    </div>`;
  document.querySelectorAll("[data-source-tab]").forEach(button => {
    const active=button.dataset.sourceTab === state.profile.tab;
    button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));
  });
  chips.innerHTML="";
  if (state.profile.tab === "posts") {
    const categories=["all","news","course","event","campaign","jobs","stores"];
    const present=new Set(posts.map(p => normalizeId(p.category)));
    chips.innerHTML=categories.filter(id => id === "all" || present.has(id)).map(id =>
      `<button class="source-profile-chip ${state.profile.category === id ? "active" : ""}"
       data-profile-category="${id}" type="button">${id === "all" ? "Tümü" : escapeHtml(titleCaseTurkish(categoryName(id)))}</button>`).join("");
  }
  if (["posts","events","courses"].includes(state.profile.tab)) {
    let chosen=posts;
    if (state.profile.tab === "events") chosen=posts.filter(p => normalizeId(p.category) === "event");
    else if (state.profile.tab === "courses") chosen=posts.filter(p => normalizeId(p.category) === "course");
    else if (state.profile.category !== "all") chosen=posts.filter(p => normalizeId(p.category) === state.profile.category);
    content.innerHTML=chosen.length ? chosen.map(createPostCard).join("") :
      `<div class="empty-state"><strong>Bu bölümde içerik yok</strong><p>Şu an alınan seçilmiş akışta bu kaynağa ait kayıt bulunmuyor.</p></div>`;
    return;
  }
  if (state.profile.tab === "about") {
    const entries=[
      ["Kurum",source.name],["Kaynak türü",source.sourceType],["Branş",source.sportLabel],
      ["Merkez",source.city],["İlçe",source.district],["Ülke",source.country]
    ].filter(([,v]) => cleanString(v));
    content.innerHTML=`<div class="source-profile-info"><h3>Hakkında</h3>
      ${source.description ? `<p>${escapeHtml(source.description)}</p>` : ""}
      ${entries.map(([label,value]) => `<div class="source-profile-info-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}
      <p>Profil ve yayınlar SporNRD'nin kaynaklardan topladığı bilgilere göre gösterilir.</p></div>`;
    return;
  }
  if (state.profile.tab === "contact") {
    const rows=[
      ["Adres",source.address],["Telefon",source.phone],["E-posta",source.email]
    ].filter(([,v]) => cleanString(v));
    const official=[...([{label:"Resmî Web Sitesi",url:source.website},{label:"İletişim Sayfası",url:source.contactUrl}]),...getProfileSocialLinks(source)]
      .filter(item => isSafeUrl(item.url));
    content.innerHTML=`<div class="source-profile-info"><h3>İletişim ve Bağlantılar</h3>
      ${rows.map(([label,value]) => `<div class="source-profile-info-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}
      ${official.map(item => `<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)} ↗</a></p>`).join("")}
      ${!rows.length && !official.length ? `<p>Bu kaynak için doğrulanmış iletişim bilgisi bulunmuyor.</p>` : ""}
    </div>`;
  }
}
async function shareSourceProfile(sourceId) {
  const source=getSourceProfileById(sourceId);if (!source) return;
  const url=createProfileUrl(source.id);
  try {
    if (navigator.share) {await navigator.share({title:`${source.name} · SporNRD`,text:"SporNRD kaynak profili",url});return;}
    if (navigator.clipboard) {await navigator.clipboard.writeText(url);showToast("Profil bağlantısı kopyalandı.");return;}
    showToast("Profil bağlantısı paylaşılamadı.");
  } catch { /* Kullanıcı paylaşımı iptal edebilir */ }
}

/* DETAY MODALI - ESKİ VERİ ALANLARI KORUNDU */
function pushDetailRow(rows,label,value) {const text=cleanString(value);if (text) rows.push([label,text]);}
function extractUsefulDetailFields(post) {
  const details=isPlainObject(post.details) ? post.details : {};
  const rows=[];
  pushDetailRow(rows,"Başlangıç",details.startDate || details.eventDate);
  pushDetailRow(rows,"Bitiş",details.endDate);
  pushDetailRow(rows,"Son Başvuru",details.registrationDeadline || details.applicationDeadline);
  pushDetailRow(rows,"Saat",details.startTime);
  pushDetailRow(rows,"Ücret",formatPrice(details.price,details.currency));
  pushDetailRow(rows,"Kontenjan",details.capacity);pushDetailRow(rows,"Seviye",details.level);
  return rows;
}
function buildDetailRows(post) {
  const rows=[
    ["Kaynak",getSourceName(post)],["Spor",getSportName(post)],
    ["Kategori",categoryName(post.category)],["İçerik",subCategoryName(post.subCategory)],
    ["Niyet",intentName(post.contentIntent)],["Tarih",post.date || "-"],
    ["İl",post.city || "-"],["Yer",post.location || "Türkiye"],
    ...extractUsefulDetailFields(post)
  ];
  return rows.filter(([,v]) => cleanString(v)).map(([label,value]) =>
    `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("");
}
function buildDetailDebug(post) {
  const config=window.SPORNRD_CONFIG?.preview || {};
  if (config.showSelectionDebug !== true && config.showRankingDebug !== true && config.showTemporalDebug !== true) return "";
  const rows=[];
  if (config.showSelectionDebug === true) {
    pushDetailRow(rows,"Selection",formatScore(post.selectionScore));
    pushDetailRow(rows,"Decision",post?.selectionMeta?.decision);
  }
  if (config.showRankingDebug === true) pushDetailRow(rows,"Ranking",formatScore(post.rankingScore));
  if (config.showTemporalDebug === true) {
    pushDetailRow(rows,"Temporal",post?.temporal?.state);
    pushDetailRow(rows,"Action State",post?.temporal?.actionState);
  }
  if (!rows.length) return "";
  return `<div class="detail-original"><strong>SPORNRD MOTOR KARARI</strong>
    ${rows.map(([label,value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("")}</div>`;
}
function openPostDetail(id) {
  const post=findPost(id);if (!post) return;
  recordLearning(post,"detail");
  const sourceShortName=getSourceShortName(post);
  const sourceLabel=document.getElementById("detailSourceLabel");
  if (sourceLabel) sourceLabel.textContent=`${sourceShortName} · ${getSportName(post)} · Resmî Kaynak`;
  const container=document.getElementById("detailContent");if (!container) return;
  container.innerHTML=`
    ${post.image ? `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title || "")}" loading="lazy" referrerpolicy="no-referrer">` : ""}
    <span class="editorial-badge">${escapeHtml(post.editorialLabel || "SporNRD Özeti")}</span>
    <h2>${escapeHtml(post.title || "Spor duyurusu")}</h2>
    ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}
    ${buildDetailRows(post)}
    ${post.originalTitle && post.originalTitle !== post.title ? `<div class="detail-original"><strong>ORİJİNAL BAŞLIK</strong><p>${escapeHtml(post.originalTitle)}</p></div>` : ""}
    ${buildDetailDebug(post)}
    ${post.sourceId ? `<button class="detail-link secondary" data-source-profile="${escapeHtml(post.sourceId)}" type="button">${escapeHtml(sourceShortName)} Kaynak Profilini Gör</button>` : ""}
    ${post.url ? `<button class="detail-link" data-source-url="${escapeHtml(post.url)}" data-post-id="${escapeHtml(post.id)}" type="button">Resmî ${escapeHtml(sourceShortName)} Kaynağını Aç</button>` : ""}
    ${post.pdfUrl ? `<button class="detail-link secondary" data-source-url="${escapeHtml(post.pdfUrl)}" data-post-id="${escapeHtml(post.id)}" type="button">Resmî PDF'yi Aç</button>` : ""}`;
  openModal("detailModal");
}
function findPost(id) {return state.posts.find(item => String(item.id) === String(id));}
function openSafeUrl(value) {
  if (!isSafeUrl(value)) {showToast("Geçerli kaynak bağlantısı bulunamadı.");return;}
  window.open(value,"_blank","noopener,noreferrer");
}
function openModal(id) {
  const modal=document.getElementById(id);if (!modal) return;
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
}
function closeModal(id) {
  const modal=document.getElementById(id);if (!modal) return;
  modal.classList.remove("open");modal.setAttribute("aria-hidden","true");
  if (!document.querySelector(".modal.open")) document.body.classList.remove("modal-open");
}

/* KEŞFET - ÖNCEKİ ARAMA DAVRANIŞI */
function searchPosts(query) {
  const posts=state.posts.filter(post => !getInteraction(post.id).trash);
  if (!query) return rankPosts(posts);
  return rankPosts(posts.filter(post => normalizeText([
    post.title,post.summary,post.location,post.city,post.category,categoryName(post.category),
    post.subCategory,subCategoryName(post.subCategory),post.section,post.contentIntent,
    intentName(post.contentIntent),post.originalTitle,post.originalText,post.source,
    post.sourceShortName,post.sourceId,post.sport,getSportName(post),
    ...(Array.isArray(post.tags) ? post.tags : [])
  ].filter(Boolean).join(" ")).includes(query)));
}
function renderSearchResults(elementId,results) {
  const container=document.getElementById(elementId);if (!container) return;
  if (!Array.isArray(results) || !results.length) {
    container.innerHTML=`<div class="empty-state"><strong>Sonuç bulunamadı</strong></div>`;return;
  }
  container.innerHTML=results.map(post => `<button class="result-card" data-detail-id="${escapeHtml(post.id)}" type="button">
    <strong>${escapeHtml(post.title || "Spor duyurusu")}</strong>
    <span>${escapeHtml(getSourceShortName(post))} · ${escapeHtml(getSportName(post))}
    · ${escapeHtml(categoryName(post.category))}${post.city ? ` · ${escapeHtml(post.city)}` : ""}${post.date ? ` · ${escapeHtml(post.date)}` : ""}</span>
    </button>`).join("");
}
function runDiscoverSearch() {
  const query=normalizeText(document.getElementById("discoverInput")?.value || "");
  renderSearchResults("discoverResults",searchPosts(query));
}

/* SAYFALAR / MENÜ */
function switchPage(pageId) {
  if (!pageId || !document.getElementById(pageId)) return;
  state.currentPage=pageId;
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active-page"));
  document.getElementById(pageId).classList.add("active-page");
  const navPage=pageId === "sourceProfilePage" ? state.profile.returnPage : pageId;
  document.querySelectorAll(".bottom-nav-item").forEach(button => button.classList.toggle("active",button.dataset.page === navPage));
  if (pageId === "sourcesPage") {renderSources();renderSourceStats();}
  window.scrollTo(0,0);
}

/* EVENT BAĞLANTILARI - DEVREDİLMİŞ CLICK */
function bindEvents() {
  document.getElementById("homeButton")?.addEventListener("click",() => switchPage("feedPage"));
  document.getElementById("refreshButton")?.addEventListener("click",() => loadLiveFeed(true));
  document.getElementById("openFilterButton")?.addEventListener("click",openFilter);
  document.getElementById("applyFiltersButton")?.addEventListener("click",applyDraftFilters);
  document.getElementById("clearFiltersButton")?.addEventListener("click",clearDraftFilters);
  document.getElementById("clearActiveFiltersButton")?.addEventListener("click",clearActiveFilters);
  document.getElementById("sourceProfileBackButton")?.addEventListener("click",closeSourceProfile);
  document.getElementById("shareSourceProfileButton")?.addEventListener("click",() => shareSourceProfile(state.profile.sourceId));
  document.getElementById("sourceSearchInput")?.addEventListener("input",renderSources);
  for (const input of document.querySelectorAll("[data-filter-input]")) {
    const type=input.dataset.filterInput;if (!FILTER_TYPES.includes(type)) continue;
    input.addEventListener("focus",() => {
      state.filterQueries[type]="";renderFilterOptions(type);openFilterDropdown(type);
      try { input.select(); } catch { /* mobil desteği */ }
    });
    input.addEventListener("input",() => handleFilterInput(type,input.value));
    input.addEventListener("keydown",event => {
      if (event.key === "Escape") {closeFilterDropdown(type);input.blur();return;}
      if (event.key === "Enter") {event.preventDefault();chooseFirstVisibleFilterOption(type);}
    });
  }
  document.querySelectorAll(".bottom-nav-item").forEach(button => button.addEventListener("click",() => switchPage(button.dataset.page)));
  document.querySelectorAll(".category-item").forEach(button => button.addEventListener("click",() => applyTopCategory(button.dataset.category || "all")));
  document.getElementById("discoverSearchButton")?.addEventListener("click",runDiscoverSearch);
  document.getElementById("discoverInput")?.addEventListener("keydown",event => {if(event.key === "Enter") runDiscoverSearch();});
  document.addEventListener("click",event => {
    const target=event.target;if (!target || typeof target.closest !== "function") return;
    if (target.classList?.contains("modal") && target.classList.contains("open")) {
      closeAllFilterDropdowns();closeModal(target.id);return;
    }
    const close=target.closest("[data-close]");
    if (close) {closeAllFilterDropdowns();closeModal(close.dataset.close);return;}
    const filterToggle=target.closest("[data-filter-toggle]");
    if (filterToggle) {toggleFilterDropdown(filterToggle.dataset.filterToggle);return;}
    const filterChoice=target.closest("[data-filter-type][data-filter-value]");
    if (filterChoice) {handleFilterChoice(filterChoice.dataset.filterType,filterChoice.dataset.filterValue);return;}
    const profileLink=target.closest("[data-source-profile]");
    if (profileLink) {
      if (document.getElementById("detailModal")?.classList.contains("open")) closeModal("detailModal");
      openSourceProfile(profileLink.dataset.sourceProfile);return;
    }
    const profileTab=target.closest("[data-source-tab]");
    if (profileTab) {state.profile.tab=profileTab.dataset.sourceTab;state.profile.category="all";renderSourceProfile();return;}
    const categoryChip=target.closest("[data-profile-category]");
    if (categoryChip) {state.profile.category=categoryChip.dataset.profileCategory;renderSourceProfile();return;}
    const follow=target.closest("[data-source-follow]");
    if (follow) {handleSourceFollow(follow.dataset.sourceFollow);return;}
    const comments=target.closest("[data-source-comments]");
    if (comments) {openSourceComments(comments.dataset.sourceComments);return;}
    const ratingButton=target.closest("[data-source-rating]");
    if (ratingButton) {openSourceRating(ratingButton.dataset.sourceRating);return;}
    const rateChoice=target.closest("[data-source-rate][data-rating-value]");
    if (rateChoice) {handleSourceRating(rateChoice.dataset.sourceRate,rateChoice.dataset.ratingValue);return;}
    const openWebsite=target.closest("[data-open-source-website]");
    if (openWebsite) {openSafeUrl(getSourceProfileById(openWebsite.dataset.openSourceWebsite)?.website);return;}
    const shareSource=target.closest("[data-share-source]");
    if (shareSource) {shareSourceProfile(shareSource.dataset.shareSource);return;}
    const action=target.closest("[data-action]");
    if (action) {handleAction(action.dataset.action,action.dataset.postId);return;}
    const detail=target.closest("[data-detail-id]");
    if (detail) {openPostDetail(detail.dataset.detailId);return;}
    const sourceLink=target.closest("[data-source-url]");
    if (sourceLink) {
      if (sourceLink.hasAttribute("disabled")) return;
      const post=findPost(sourceLink.dataset.postId);
      if (post) recordLearning(post,"source");
      openSafeUrl(sourceLink.dataset.sourceUrl);return;
    }
    if (!target.closest(".filter-select-box")) closeAllFilterDropdowns();
  });
  document.addEventListener("submit",event => {
    const form=event.target?.closest?.("[data-source-comment-form]");
    if (!form) return;
    event.preventDefault();
    saveSourceComment(form);
  });
  document.addEventListener("keydown",event => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".filter-select-box.open")) {closeAllFilterDropdowns();return;}
    const modals=[...document.querySelectorAll(".modal.open")];
    if (modals.length) {modals.forEach(m => closeModal(m.id));return;}
    if (state.currentPage === "sourceProfilePage") closeSourceProfile();
  });
}

/* AÇILIŞ - AKTİF PROFİL DEEP LINK DESTEĞİ */
async function initializeApp() {
  removeLegacyCaches();loadInteractions();loadSourceEngagement();loadFilters();bindEvents();loadCachedFeed();
  syncCategoryButtons();updateSubtitle();renderActiveFilterBar();renderSources();
  await loadLiveFeed();
  const requestedSource=new URLSearchParams(window.location.search).get("source");
  if (requestedSource && getSourceProfileById(requestedSource)) openSourceProfile(requestedSource);
  startAutomaticRefresh();
}
initializeApp();
