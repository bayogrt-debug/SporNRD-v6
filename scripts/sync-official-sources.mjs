/* SporNRD kaynak dizini senkronizasyonu — GSB resmî kurum dizinlerinden ADAY kaydı.
   Mevcut TYF/TBF okuyucularını, Worker'ı veya canlı haber akışını değiştirmez.
   Harici npm paketi / gizli anahtar gerektirmez. Node 22+.
*/
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const OFFICIAL = Object.freeze({
  federations: 'https://shgm.gsb.gov.tr/Federasyonlar',
  offices: 'https://www.gsb.gov.tr/tr/sayfa/5037-tasra-teskilati'
});

const FED_REG = 'worker/sources/federasyonlar/registry.json';
const PRO_REG = 'worker/sources/genclik_spor_il_mudurlukleri/registry.json';
const htmlEntities = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ouml:'ö',uuml:'ü',ccedil:'ç',Ouml:'Ö',Uuml:'Ü',Ccedil:'Ç',shy:'',rsquo:'’',ldquo:'“',rdquo:'”'};
const txt = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const deEnt = v => String(v).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, entity) => {
  if (entity.startsWith('#')) {
    const hex = entity[1]?.toLowerCase() === 'x';
    const n = parseInt(entity.slice(hex?2:1), hex?16:10);
    return Number.isInteger(n) && n >= 32 && n <= 0x10FFFF ? String.fromCodePoint(n) : ' ';
  }
  return htmlEntities[entity] ?? htmlEntities[entity.toLowerCase()] ?? all;
});
export const slug = name => txt(name).toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const normalizeFed = name => slug(name).replace(/-(baskanligi|bsk|baskani)$/,'');
const decodeMarkup = html => deEnt(String(html).replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
const untag = html => txt(decodeMarkup(html).replace(/<[^>]+>/g,' '));

export function parseFederations(html) {
  // Federasyon sayfası metinleri başlık, tablo veya kartta olabilir. Site tasarımı değişince
  // yanlış veri yazmamak için sayı eşiği kontrolü sync() sırasında yapılır.
  const text = decodeMarkup(html).replace(/<[^>]+>/g, '\n');
  const lines = text.split(/[\n\r]+/).map(txt).filter(Boolean);
  const out = new Map();
  for (const line of lines) {
    if (line.length > 170 || line.length < 15 || !line.includes('Türkiye')) continue;
    const found = line.match(/Türkiye\s+[\p{L}\p{N}\s-]{2,130}?\s+Federasyon(?:u|ları)?(?:\s+Başkanlığı|\s+Bşk\.?)?/iu);
    if (!found) continue;
    const name = txt(found[0]);
    // Old catalog included genuine variations: "Federasyon Başkanlığı" (no 'u').
    if (/Türkiye\s+(Cumhuriyeti|Gençlik)/iu.test(name)) continue;
    out.set(normalizeFed(name), name);
  }
  return [...out.values()];
}

export function parseOffices(html) {
  const matches = [...String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const out = new Map();
  for (const match of matches) {
    const hrefMatch = match[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) continue;
    let url;
    try {url = new URL(deEnt(hrefMatch[2]), OFFICIAL.offices);} catch {continue;}
    if (!(url.hostname.endsWith('.gsb.gov.tr') && url.protocol === 'https:')) continue;
    const display = untag(match[2]);
    const prefix = display.match(/^([\p{L}\s-]{2,35}?)\s+Gençlik ve Spor İl Müdürlüğü/iu);
    if (!prefix) continue;
    const city = txt(prefix[1]);
    const name = `${city} Gençlik ve Spor İl Müdürlüğü`;
    out.set(url.hostname, {name, city, officialSite:`https://${url.hostname}`});
  }
  return [...out.values()];
}

async function fetchOfficial(url) {
  const res = await fetch(url,{headers:{'Accept':'text/html','User-Agent':'SporNRD-Source-Directory-Sync/1.0'},signal:AbortSignal.timeout(18000)});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const final = new URL(res.url);
  if (final.protocol !== 'https:' || !(final.hostname === 'gsb.gov.tr' || final.hostname.endsWith('.gsb.gov.tr')))
    throw new Error('Kaynak resmi GSB alan adı dışında bir adrese yönlendirdi.');
  if (Number(res.headers.get('content-length')) > 5_000_000) throw new Error('Beklenmeyen büyüklükte HTML.');
  const body = await res.text();
  if (body.length > 5_000_000) throw new Error('HTML 5 MB sınırını aşıyor.');
  return body;
}

const loadJson = async path => JSON.parse(await readFile(resolve(path),'utf8'));
async function writeIfDifferent(path, document) {
  const p = resolve(path);
  const before = await readFile(p,'utf8');
  const after = JSON.stringify(document,null,2)+'\n';
  if (before !== after) {await writeFile(p,after,'utf8');return true;}
  return false;
}
const baseFed = (name,id) => ({
  id,name,group:'federasyonlar',directoryUrl:OFFICIAL.federations,
  discoveryMethod:'official_directory',discoveryStatus:'discovered',
  readerStatus:'awaiting_official_channel',identityVerifiedBySporNRD:false,
  contentRightsVerified:false,officialSite:null
});
const baseOffice = item => ({
  id:`gsb-il-${item.officialSite.replace('https://','').split('.')[0]}`,
  name:item.name,city:item.city,group:'genclik_spor_il_mudurlukleri',
  officialSite:item.officialSite,directoryUrl:OFFICIAL.offices,
  discoveryMethod:'official_directory',discoveryStatus:'discovered',
  readerStatus:'awaiting_official_channel',identityVerifiedBySporNRD:false,
  contentRightsVerified:false
});

export function mergeFederations(document, names) {
  const existing = new Map(document.federations.map(r => [normalizeFed(r.name),r]));
  const idSet = new Set(document.federations.map(r => r.id));
  let added = 0;
  for (const name of names) {
    const k = normalizeFed(name);
    if (existing.has(k)) continue;
    let id = `tr-${k.replace(/^turkiye-/,'')}`;
    if (idSet.has(id)) id = `tr-${k}`;
    if (idSet.has(id)) continue;
    const record = baseFed(name,id);
    document.federations.push(record);existing.set(k,record);idSet.add(id);added++;
  }
  document.federations.sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  document.count=document.federations.length;
  return added;
}
export function mergeOffices(document, offices) {
  const existing = new Set(document.offices.map(r => new URL(r.officialSite).hostname));
  let added=0;
  for (const item of offices) {
    const host = new URL(item.officialSite).hostname;
    if (existing.has(host)) continue;
    document.offices.push(baseOffice(item)); existing.add(host);added++;
  }
  document.offices.sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  document.count=document.offices.length;
  return added;
}

export async function sync({federationsHtml,officesHtml}={}) {
  const report=[];
  const tasks=[
    {label:'Federasyonlar',url:OFFICIAL.federations,html:federationsHtml,path:FED_REG,min:40,parse:parseFederations,merge:mergeFederations},
    {label:'İl Müdürlükleri',url:OFFICIAL.offices,html:officesHtml,path:PRO_REG,min:65,parse:parseOffices,merge:mergeOffices}
  ];
  for (const task of tasks) {
    try {
      const html = task.html ?? await fetchOfficial(task.url);
      const parsed = task.parse(html);
      if (parsed.length < task.min) throw new Error(`Eksik veya değişmiş dizin yapısı: ${parsed.length} kayıt (güvenlik eşiği ${task.min}).`);
      const current=await loadJson(task.path);
      const newCount=task.merge(current,parsed);
      const changed=await writeIfDifferent(task.path,current);
      report.push({source:task.label,checked:parsed.length,added:newCount,total:current.count,changed});
    } catch (err) {
      // Bir site erişilemezse mevcut registry JSON kesinlikle silinmez.
      report.push({source:task.label,error:String(err?.message||err),changed:false});
    }
  }
  return report;
}
const directRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (directRun) {
  const result=await sync();
  for (const r of result) console.log(JSON.stringify(r));
  if (result.every(r=>r.error)) process.exitCode=1;
}
