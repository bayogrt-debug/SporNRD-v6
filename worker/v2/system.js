/* SporNRD v2 entegre test sistemi — var olan Worker'a EKLENİR; üretimi değiştirmez. */
import {INITIAL_SEEDS,SOURCE_GROUPS} from './seeds.js';
import {TAXONOMY,classifyWithTaxonomy} from './taxonomy.js';
import {buildFeedPreview} from '../core/feedPreview.js';
import {getTyfFeed} from '../sources/tyf.js';
import {getTbfFeed} from '../sources/tbf.js';

const VERSION='2.0.0-test';
const PROVIDERS={
 tyf:{id:'tyf',name:'Türkiye Yüzme Federasyonu',shortName:'TYF',sport:'Yüzme',sourceType:'FEDERASYON',verified:true,enabled:true,endpoint:'/api/tyf',getFeed:getTyfFeed},
 tbf:{id:'tbf',name:'Türkiye Basketbol Federasyonu',shortName:'TBF',sport:'Basketbol',sourceType:'FEDERASYON',verified:true,enabled:true,endpoint:'/api/tbf',getFeed:getTbfFeed}
};
const KNOWN_DOMAINS={tyf:'tyf.gov.tr',tbf:'tbf.org.tr'};
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'};
function output(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function err(message,status=400){return output({ok:false,version:VERSION,error:message},status);}
function dbOf(env){return env?.SPORNRD_DB;}
function clip(s,n=800){return String(s??'').replace(/\s+/g,' ').trim().slice(0,n);}
function safeId(s){return /^[a-z\d][a-z\d_-]{1,100}$/i.test(String(s||''));}
function safeUrl(s){try{let u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||u.hostname.endsWith('.local')||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)||u.hostname==='localhost')return null;return u;}catch{return null;}}
function sameHost(u,host){return u.hostname===host||u.hostname.endsWith('.'+host);}
function canonUrl(input){const u=safeUrl(input);if(!u)return null;u.hash=''; for(const p of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$|^igshid$/i.test(p))u.searchParams.delete(p);return u.toString();}
async function authorized(request,env){
 const configured=String(env?.SPORNRD_ADMIN_TOKEN||'');
 const header=String(request.headers.get('Authorization')||'');
 if(!configured||configured.length<24||!header.startsWith('Bearer '))return false;
 const provided=header.slice(7);
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(configured)));
 const b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(provided)));
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
async function bodyJson(request){if(Number(request.headers.get('Content-Length')||0)>16000)throw new Error('İstek çok büyük.');const t=await request.text();if(t.length>16000)throw new Error('İstek çok büyük.');return JSON.parse(t||'{}');}
const stats=()=>({version:VERSION,declaredCategories:Object.keys(TAXONOMY.categories).length,declaredSubcategories:Object.values(TAXONOMY.categories).reduce((a,x)=>a+x.length,0),declaredContentTypes:Object.values(TAXONOMY.categories).reduce((a,x)=>a+x.reduce((b,s)=>b+s.items.length,0),0),catalogCandidates:INITIAL_SEEDS.length,readerSources:Object.keys(PROVIDERS)});
async function audit(db,action,target,detail=''){await db.prepare('INSERT INTO audit_log(action,target,detail) VALUES(?,?,?)').bind(action,target,clip(detail,2000)).run();}
export async function bootstrapSources(db){
 const tasks=[];
 for (const group of SOURCE_GROUPS)tasks.push(db.prepare('INSERT OR IGNORE INTO source_groups(id,name) VALUES(?,?)').bind(group.id,group.name));
 const extras={genclik_spor_bakanligi:'Gençlik ve Spor Bakanlığı',genclik_spor_ilce_mudurlukleri:'Gençlik ve Spor İlçe Müdürlükleri',universite_besyo:'BESYO / Spor Bilimleri Bölümleri',spor_akademileri:'Spor Akademileri',spor_okullari:'Spor Okulları',spor_salonlari:'Spor Salonları',spor_tesisleri:'Spor Tesisleri',spor_kulupleri:'Spor Kulüpleri',belediye_spor:'Belediyeler Spor Birimleri',kariyer_staj:'İş, Staj ve Gönüllülük',spor_markalari:'Spor Markaları',spor_magazalari:'Spor Mağazaları',kampanya_platformlari:'Kampanyalar',spor_sagligi:'Spor Sağlığı'};
 for(const [k,v] of Object.entries(extras))tasks.push(db.prepare('INSERT OR IGNORE INTO source_groups(id,name) VALUES(?,?)').bind(k,v));
 // Create groups first to satisfy FK; batch reduces Worker/D1 round trips.
 await db.batch(tasks);
 let added=0;
 const records=[];
 for(const source of INITIAL_SEEDS){
  const u=safeUrl(source.officialSite)?.toString()||null;
  records.push(db.prepare('INSERT OR IGNORE INTO sources(id,name,group_id,official_site,directory_url,city) VALUES(?,?,?,?,?,?)').bind(source.id,source.name,source.group,u,safeUrl(source.directoryUrl)?.toString()||null,source.city||null));
  if(u)records.push(db.prepare('INSERT OR IGNORE INTO source_channels(source_id,kind,url) VALUES(?,?,?)').bind(source.id,'website',u));
 }
 for(let i=0;i<records.length;i+=35){const results=await db.batch(records.slice(i,i+35));added+=results.filter(r=>r.meta?.changes>0).length;}
 // Only original TYF/TBF reader code is approved to read and summarize automatically.
 for(const id of ['tyf','tbf']){
  await db.prepare('UPDATE sources SET status=?,identity_verified=1,rights_mode=?,reader_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN (\'candidate\',\'review\')').bind('active','summary_link',id,id).run();
 }
 await audit(db,'bootstrap','catalog',`Upserted ${added} source/channel records; 2 pre-existing readers active.`);
 return {recordsProcessed:INITIAL_SEEDS.length,catalog:INITIAL_SEEDS.length,dbUpserts:added};
}

function matchSource(item){const id=String(item.sourceId||'').toLowerCase();if(!PROVIDERS[id])return null;return id;}
function normalizePost(post){
 const sourceId=matchSource(post);
 if(!sourceId)return {reason:'reader_unknown'};
 const url=canonUrl(post.url||post.sourceUrl);
 if(!url||!sameHost(new URL(url),KNOWN_DOMAINS[sourceId]))return {reason:'source_host_mismatch'};
 const originalTitle=clip(post.originalTitle||post.title,300);
 const editorialTitle=clip(post.title,180);
 const summary=clip(post.summary,600);
 if(originalTitle.length<8||editorialTitle.length<8||summary.length<12)return {reason:'insufficient_real_content'};
 const derived=classifyWithTaxonomy(post);
 const date=clip(post.date,60);
 if(date&&Number.isNaN(Date.parse(date)))return {reason:'bad_source_date'};
 const facts=post.facts&&typeof post.facts==='object'?post.facts:{};
 const factsClean=Object.fromEntries(Object.entries(facts).filter(([k,v])=>typeof v==='string'||typeof v==='number'||v===null).slice(0,28).map(([k,v])=>[k,typeof v==='string'?clip(v,200):v]));
 const caption=`${editorialTitle}\n\n${summary}\n\nKaynak: ${clip(post.source,100)}\nOrijinal içerik: ${url}\n\n#SporNRD`;
 return {sourceId,url,originalTitle,originalExcerpt:clip(post.originalText,800),date,category:derived.category,subcategory:derived.subcategory,contentTitle:derived.contentTitle,tags:derived.tags,facts:factsClean,editorialTitle,summary,caption,score:Number(post.finalScore)||0};
}
async function sha(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function ingestRealFeeds(env,options={}){
 const db=dbOf(env);if(!db)throw new Error('D1 binding yok.');
 const runId=crypto.randomUUID();
 await db.prepare('INSERT INTO scan_runs(id,kind) VALUES(?,?)').bind(runId,'real_feeds').run();
 const active=await db.prepare("SELECT id,status,identity_verified,rights_mode FROM sources WHERE id IN ('tyf','tbf')").all();
 const eligible=new Set((active.results||[]).filter(x=>x.status==='active'&&x.identity_verified===1&&['summary_link','permission'].includes(x.rights_mode)).map(x=>x.id));
 const chosen=[...eligible].map(id=>PROVIDERS[id]);
 let count=0,published=0,rejected=0;const errors=[];
 try{
  if(chosen.length){
   const result=await buildFeedPreview({providers:chosen,env,limit:30,requestedSources:[...eligible],includeBorderline:false});
   errors.push(...(result.errors||[]).map(x=>({stage:'existing_pipeline',sourceId:x.sourceId||'',message:clip(x.error||x.detail,300)})));
   for(const raw of result.items||[]){
    count++;
    const parsed=normalizePost(raw);
    if(parsed.reason){rejected++;continue;}
    const id=(await sha(parsed.url)).slice(0,32);
    const changes=await db.prepare(`INSERT INTO content_items(id,source_id,original_url,original_title,original_excerpt,original_published_at,category,subcategory,content_title,topic_tags,facts_json,editorial_title,editorial_summary,social_caption,score,state)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'published')
    ON CONFLICT(original_url) DO UPDATE SET original_title=excluded.original_title,original_excerpt=excluded.original_excerpt,original_published_at=excluded.original_published_at,category=excluded.category,subcategory=excluded.subcategory,content_title=excluded.content_title,topic_tags=excluded.topic_tags,facts_json=excluded.facts_json,editorial_title=excluded.editorial_title,editorial_summary=excluded.editorial_summary,social_caption=excluded.social_caption,score=excluded.score,updated_at=CURRENT_TIMESTAMP
    WHERE content_items.source_id=excluded.source_id AND content_items.state='published'`).bind(id,parsed.sourceId,parsed.url,parsed.originalTitle,parsed.originalExcerpt,parsed.date,parsed.category,parsed.subcategory,parsed.contentTitle,JSON.stringify(parsed.tags),JSON.stringify(parsed.facts),parsed.editorialTitle,parsed.summary,parsed.caption,parsed.score).run();
    published+=Number(changes.meta?.changes||0);
   }
  }
 }catch(e){errors.push({stage:'ingest',message:clip(e.message,250)});}
 await db.prepare('UPDATE scan_runs SET completed_at=CURRENT_TIMESTAMP,scanned=?,published=?,rejected=?,errors_json=? WHERE id=?').bind(count,published,rejected,JSON.stringify(errors).slice(0,4000),runId).run();
 await audit(db,'ingest',runId,`Read ${count}, upserts ${published}, rejected ${rejected}, errors ${errors.length}`);
 return {runId,selectedItems:count,insertedOrUpdated:published,rejected,errors,emptyIsNotSuccess:count===0};
}
function decodeHtml(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
const OFFICIAL_DIRECTORY_SITES=[
 {group:'federasyonlar',url:'https://shgm.gsb.gov.tr/Federasyonlar',host:'shgm.gsb.gov.tr'},
 {group:'genclik_spor_il_mudurlukleri',url:'https://www.gsb.gov.tr/tr/sayfa/5037-tasra-teskilati',host:'www.gsb.gov.tr'}
];
// No general-purpose crawler or arbitrary URL fetch. Only these two official directory URLs.
export async function discoverOfficialCandidates(env){
 const db=dbOf(env);if(!db)throw new Error('D1 binding yok.');
 const result=[];
 for(const dir of OFFICIAL_DIRECTORY_SITES){
  let inserted=0,parsed=0,warning='';
  try{
   const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),9000);
   let response;
   try{response=await fetch(dir.url,{redirect:'manual',signal:ctrl.signal,headers:{Accept:'text/html'}});}finally{clearTimeout(timeout);}
   if(response.status!==200||!String(response.headers.get('content-type')||'').includes('text/html'))throw new Error('Resmî dizin HTML yanıtı alınamadı.');
   const body=await response.text();if(body.length>1400000)throw new Error('Dizin yanıtı aşırı büyük.');
   const anchor=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
   const seen=new Set();let match;
   while((match=anchor.exec(body))&&parsed<160){
    const text=clip(decodeHtml(match[2]),140);
    let link;try{link=safeUrl(new URL(match[1],dir.url).toString());}catch{continue;}
    if(!link)continue;
    const fed=dir.group==='federasyonlar';
    const qualifies=fed?/federasyon(u|ü|lar)/i.test(text)&&text.length>12:/^(?:[\p{L}\s.-]{2,40})(?:\s+Gençlik ve Spor(?: İl)? Müdürlüğü)?$/iu.test(text)&&sameHost(link,'gsb.gov.tr')&&link.hostname.split('.').length>=3;
    if(!qualifies)continue;
    if(fed&&!sameHost(link,'gsb.gov.tr')&&!/federasyon/i.test(link.hostname))continue;
    const unique=fed?text.toLocaleLowerCase('tr'):link.hostname;
    if(seen.has(unique))continue;seen.add(unique);parsed++;
    const stable=(await sha(`${dir.group}|${unique}`)).slice(0,18);
    const sid=`auto-${stable}`;
    // Deduplicate against existing catalog by normalized exact title or official domain.
    const existing=await db.prepare('SELECT id FROM sources WHERE group_id=? AND (name=? OR official_site=?) LIMIT 1').bind(dir.group,text,link.origin+'/').first();
    if(existing)continue;
    const insert=await db.prepare('INSERT OR IGNORE INTO sources(id,name,group_id,official_site,directory_url,status) VALUES(?,?,?,?,?,?)').bind(sid,text,dir.group,fed?null:link.origin+'/',dir.url,'candidate').run();
    inserted+=Number(insert.meta?.changes||0);
   }
   if(parsed===0)warning='Dizinden uygun bağlantı ayrılamadı; mevcut katalog korundu.';
  }catch(e){warning=clip(e.message,200);}
  result.push({directory:dir.url,candidatesParsed:parsed,inserted,warning});
 }
 await audit(db,'discovery','official_directories',JSON.stringify(result));
 return result;
}
function prepareRow(row){if(!row)return row;return {...row,tags:JSON.parse(row.topic_tags||'[]'),facts:JSON.parse(row.facts_json||'{}'),topic_tags:undefined,facts_json:undefined,visualUrl:`/api/v2/visual/${row.id}.svg`,socialDraftUrl:`/api/v2/social-draft/${row.id}`};}
function xml(t){return String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function svgCard(row){
 const title=clip(row.editorial_title,130);
 const lines=[];const words=title.split(/\s+/);let cur='';for(const word of words){if((cur+' '+word).length>27){lines.push(cur);cur=word;}else cur=cur?cur+' '+word:word;}if(cur)lines.push(cur);
 const text=lines.slice(0,4).map((line,i)=>`<text x="74" y="${320+i*75}" font-size="57" font-weight="800" fill="#fff">${xml(line)}</text>`).join('');
 const color={Haber:'#1475ae',Kurs:'#0c906f',Etkinlik:'#8e5fba',Kampanya:'#c97f17','İş İlanları':'#2d7385',Mağazalar:'#a45564'}[row.category]||'#1475ae';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101e38"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="1020" cy="150" r="260" fill="#fff" opacity=".055"/><circle cx="100" cy="1000" r="340" fill="#fff" opacity=".055"/><text x="72" y="108" font-family="Arial,sans-serif" font-size="52" font-weight="900" fill="#fff">SporNRD</text><rect x="72" y="157" width="380" height="58" rx="29" fill="#fff" opacity=".16"/><text x="94" y="197" font-family="Arial,sans-serif" font-size="26" fill="#fff">${xml(row.category)}</text><g font-family="Arial,sans-serif">${text}</g><line x1="72" x2="1008" y1="900" y2="900" stroke="#fff" opacity=".4"/><text x="72" y="956" font-family="Arial,sans-serif" font-size="27" fill="#fff">Kaynak: ${xml(clip(row.source_name,42))}</text><text x="72" y="1010" font-family="Arial,sans-serif" font-size="24" fill="#fff" opacity=".8">Ara Bul Seç Hemen Başla</text></svg>`;
}
export async function handleV2Request(request,env){
 const url=new URL(request.url),p=url.pathname,method=request.method;
 if(!p.startsWith('/api/v2/'))return null;
 if(method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
 const db=dbOf(env);
 if(p==='/api/v2/taxonomy'&&method==='GET')return output({ok:true,taxonomy:TAXONOMY,sourceGroups:SOURCE_GROUPS,statistics:stats()});
 if(p==='/api/v2/status'&&method==='GET'){
  if(!db)return output({ok:true,database:'not_configured',...stats(),ready:false},200);
  try{
   const groups=await db.prepare('SELECT status,COUNT(*) AS count FROM sources GROUP BY status').all();
   const posts=await db.prepare("SELECT COUNT(*) AS total FROM content_items WHERE state='published'").first();
   const last=await db.prepare('SELECT * FROM scan_runs ORDER BY started_at DESC LIMIT 1').first();
   return output({ok:true,ready:true,database:'connected',...stats(),sourceStatuses:groups.results,livePosts:posts?.total||0,lastScan:last});
  }catch{return err('D1 bağlı fakat tablolar kurulmamış: migrations/0001_v2.sql',503);}
 }
 if(!db)return err('D1 veritabanı bağlı değil. Ayrı TEST veritabanı oluşturun.',503);
 if(p==='/api/v2/sources'&&method==='GET'){
  const group=clip(url.searchParams.get('group'),90),status=clip(url.searchParams.get('status'),30);
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))||40));
  const where=[],vals=[];if(group){where.push('group_id=?');vals.push(group);}if(status){where.push('status=?');vals.push(status);}
  const rows=await db.prepare(`SELECT id,name,group_id,official_site,city,status,identity_verified,rights_mode,reader_id FROM sources ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY group_id,name LIMIT ?`).bind(...vals,limit).all();
  return output({ok:true,count:rows.results?.length||0,sources:rows.results||[]});
 }
 if(p==='/api/v2/feed'&&method==='GET'){
  const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit'))||20)),cat=clip(url.searchParams.get('category'),40);
  // Feedback etkisi yalnız sıralamada ve sınırlı (+/-3 puan); güvenlik/yayın kararlarını değiştiremez.
  const sql=`SELECT i.*,s.name AS source_name,s.official_site,
    CASE WHEN COALESCE(l.n,0)>=5 THEN MAX(-3,MIN(3,COALESCE(l.weight,0)*0.2)) ELSE 0 END AS learned_boost
    FROM content_items i JOIN sources s ON s.id=i.source_id
    LEFT JOIN (SELECT source_id,COUNT(*) AS n,SUM(CASE WHEN signal IN ('save','useful','share') THEN 1 WHEN signal IN ('not_useful','wrong_category','report') THEN -2 ELSE 0 END) AS weight FROM learning_events GROUP BY source_id) l ON l.source_id=i.source_id
    WHERE i.state='published' AND s.status='active' ${cat?'AND i.category=?':''}
    ORDER BY (i.score + (CASE WHEN COALESCE(l.n,0)>=5 THEN MAX(-3,MIN(3,COALESCE(l.weight,0)*0.2)) ELSE 0 END)) DESC,i.created_at DESC LIMIT ?`;
  const rows=await db.prepare(sql).bind(...(cat?[cat]:[]),limit).all();
  return output({ok:true,count:rows.results?.length||0,items:(rows.results||[]).map(prepareRow),notice:'Özgün SporNRD özeti; orijinal içerik için kaynağı ziyaret edin.'});
 }
 if(/^\/api\/v2\/(visual|social-draft)\/[0-9a-f]{32}(\.svg)?$/.test(p)&&method==='GET'){
  const visual=p.includes('/visual/'),id=p.split('/').pop().replace(/\.svg$/,'');
  const row=await db.prepare("SELECT i.*,s.name AS source_name FROM content_items i JOIN sources s ON s.id=i.source_id WHERE i.id=? AND i.state='published'").bind(id).first();if(!row)return err('İçerik bulunamadı.',404);
  if(visual)return new Response(svgCard(row),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'none'; sandbox",'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=120'}});
  return output({ok:true,status:'draft_only',platforms:['SporNRD','Instagram','Facebook','X'],caption:row.social_caption,visualUrl:`/api/v2/visual/${id}.svg`,notPublishedToSocialMedia:true});
 }
 if(p==='/api/v2/learning'&&method==='GET'){
  const metrics=await db.prepare("SELECT signal,COUNT(*) AS count FROM learning_events GROUP BY signal").all();
  return output({ok:true,mode:'bounded_feedback_ranking',signals:metrics.results||[],minSignals:5,maxRankAdjustment:3,autoSafetyChanges:false,modelRetraining:false});
 }
 if(p.startsWith('/api/v2/admin/')&&method==='POST'){
  if(!await authorized(request,env))return err('Yetkisiz işlem.',401);
  if(p==='/api/v2/admin/bootstrap')return output({ok:true,bootstrapped:await bootstrapSources(db)});
  if(p==='/api/v2/admin/ingest')return output({ok:true,run:await ingestRealFeeds(env)});
  if(p==='/api/v2/admin/discover')return output({ok:true,officialDirectories:await discoverOfficialCandidates(env)});
  if(p==='/api/v2/admin/review'){
   const b=await bodyJson(request);if(!safeId(b.sourceId)||!['review','rejected','suspended','active'].includes(b.status))return err('Geçersiz kaynak/karar.');
   const row=await db.prepare('SELECT * FROM sources WHERE id=?').bind(b.sourceId).first();if(!row)return err('Kaynak bulunamadı.',404);
   if(b.status==='active'){
    if(!['tyf','tbf'].includes(b.sourceId))return err('Okuyucusu olmayan kaynak otomatik etkinleştirilemez.',409);
    if(b.identityVerified!==true||!['summary_link','permission'].includes(b.rightsMode)||!safeUrl(b.evidenceUrl)||clip(b.note,300).length<10)return err('Aktivasyon için doğrulanmış kimlik, hak rejimi, geçerli kanıt bağlantısı ve gerekçe zorunlu.',422);
   }
   await db.prepare('UPDATE sources SET status=?,identity_verified=?,rights_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.status,b.status==='active'?1:row.identity_verified,b.status==='active'?b.rightsMode:row.rights_mode,b.sourceId).run();
   await db.prepare('INSERT INTO source_evidence(source_id,kind,evidence_url,note) VALUES(?,?,?,?)').bind(b.sourceId,'admin_review',safeUrl(b.evidenceUrl)?.toString()||null,clip(b.note,500)).run();
   await audit(db,'source_review',b.sourceId,`status=${b.status}; note=${clip(b.note,200)}`);
   return output({ok:true,id:b.sourceId,status:b.status});
  }
  if(p==='/api/v2/admin/feedback'){
   const b=await bodyJson(request);
   const allowed=['save','share','useful','not_useful','wrong_category','report'];
   if(!allowed.includes(b.signal)||!await db.prepare('SELECT id FROM content_items WHERE id=?').bind(String(b.itemId||'')).first())return err('Geri bildirim türü veya içerik geçersiz.');
   const item=await db.prepare('SELECT id,source_id FROM content_items WHERE id=?').bind(b.itemId).first();
   await db.prepare('INSERT INTO learning_events(item_id,source_id,signal) VALUES(?,?,?)').bind(item.id,item.source_id,b.signal).run();
   return output({ok:true,recorded:true,notice:'Sadece yetkili sunucu geri bildirimi; otomatik model eğitimi yapılmıyor.'});
  }
 }
 return err('v2 endpoint bulunamadı veya HTTP metodu yanlış.',404);
}
export async function scheduledV2(env){
 if(!dbOf(env))return {ok:false,reason:'missing_d1'};
 // First deployment is read-only by default; a separate enabled switch is required.
 if(env.SPORNRD_V2_CRON_ENABLED!=='true')return {ok:false,reason:'cron_disabled'};
 const ingest=await ingestRealFeeds(env);
 // Official-directory crawling changes too often to use hourly: run once on UTC Sunday.
 const sunday=new Date().getUTCDay()===0;
 let discovered=null;
 if(sunday)discovered=await discoverOfficialCandidates(env);
 return {ok:true,ingest,discovered};
}
export const __test={normalizePost,canonUrl,safeUrl,stats,svgCard};
