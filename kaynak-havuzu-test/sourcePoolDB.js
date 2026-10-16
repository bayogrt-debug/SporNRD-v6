/* SporNRD Kaynak Havuzu - Bağımsız IndexedDB test modülü v1.5
   Mevcut SporNRD uygulaması ve Cloudflare Worker ile bağlantı kurmaz.
   Veri yalnızca bu sayfanın çalıştığı origin'in IndexedDB alanında tutulur.
*/
(function (global) {
  'use strict';

  const DB_NAME = 'spornrd_source_pool';
  const DB_VERSION = 1;
  const FORMAT = 'spornrd-source-pool-backup';
  const STORES = ['sources', 'channels', 'evidence', 'evaluations', 'auditLog', 'sourceTypes', 'discoveryCandidates'];
  const KEYS = {
    sources: 'sourceId', channels: 'channelId', evidence: 'evidenceId',
    evaluations: 'evaluationId', auditLog: 'auditId',
    sourceTypes: 'typeId', discoveryCandidates: 'candidateId'
  };
  const MAX_BACKUP_BYTES = 12 * 1024 * 1024;
  const MAX_TOTAL_RECORDS = 40000;
  const now = () => new Date().toISOString();
  const text = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const uuid = prefix => prefix + '_' + (global.crypto?.randomUUID?.() || (Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)));

  const TYPES = [
    ['sports_governance', 'Spor yönetim kuruluşları'],
    ['public_institutions', 'Kamu kurumları'],
    ['clubs_unions', 'Spor kulüpleri ve birlikleri'],
    ['education', 'Eğitim kuruluşları'],
    ['facilities', 'Spor tesisleri'],
    ['organisations', 'Spor organizasyonları'],
    ['news_media', 'Haber ve medya kuruluşları'],
    ['digital_publishers', 'Dijital spor yayıncıları'],
    ['athletes_coaches', 'Sporcular ve antrenörler'],
    ['commerce', 'Spor ticareti'],
    ['services', 'Spor hizmet sağlayıcıları'],
    ['sports_health_science', 'Spor sağlığı ve bilimi'],
    ['technology_data', 'Spor teknoloji ve veri kuruluşları'],
    ['career', 'Spor istihdam ve kariyer'],
    ['civil_society', 'Sivil toplum ve sosyal spor'],
    ['regulation_safety', 'Hukuk, düzenleme ve güvenlik'],
    ['national_federation', 'Ulusal federasyon', 'sports_governance'],
    ['international_federation', 'Uluslararası federasyon', 'sports_governance'],
    ['ministry', 'Bakanlık', 'public_institutions'],
    ['provincial_directorate', 'İl spor müdürlüğü', 'public_institutions'],
    ['sports_club', 'Spor kulübü', 'clubs_unions'],
    ['sports_academy', 'Spor akademisi', 'education'],
    ['sports_facility', 'Spor tesisi', 'facilities'],
    ['sports_news_site', 'Spor haber sitesi', 'news_media'],
    ['sports_store', 'Spor mağazası', 'commerce'],
    ['independent_publisher', 'Bağımsız spor yayıncısı', 'digital_publishers']
  ].map(([typeId, name, parentTypeId = null]) => ({
    typeId, name, parentTypeId, status: 'active', policyVersion: '1.0'
  }));

  function canonicalUrl(input) {
    const raw = text(input);
    if (!raw || raw.length > 2048) throw new Error('Geçerli bir web adresi girilmeli (en fazla 2048 karakter).');
    let url;
    try { url = new URL(raw); } catch { throw new Error('Web adresi http:// veya https:// ile başlamalı.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password)
      throw new Error('Yalnızca kullanıcı bilgisi içermeyen HTTP/HTTPS adresleri kabul edilir.');
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|yclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.pathname === '/' && !url.search ? url.origin : url.toString();
  }
  function reqPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Veritabanı isteği başarısız.'));
    });
  }
  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('İşlem geri alındı. Veri değişmedi.'));
      tx.onerror = () => { /* abort olayı hatayı aktarır */ };
    });
  }
  function openDB() {
    if (!global.indexedDB) return Promise.reject(new Error('Bu tarayıcıda IndexedDB kullanılamıyor. HTTPS veya localhost üzerinden dene.'));
    return new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const tx = request.transaction;
        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, {keyPath: KEYS[storeName]});
        }
        const sources = tx.objectStore('sources');
        sources.createIndex('byStatus', 'sourceStatus', {unique:false});
        sources.createIndex('byParent', 'parentSourceId', {unique:false});
        sources.createIndex('byType', 'primaryTypeId', {unique:false});
        const channels = tx.objectStore('channels');
        channels.createIndex('byOwner', 'ownerSourceId', {unique:false});
        channels.createIndex('byCanonicalUrl', 'canonicalUrl', {unique:true});
        const evidence = tx.objectStore('evidence');
        evidence.createIndex('bySource', 'sourceId', {unique:false});
        const evaluations = tx.objectStore('evaluations');
        evaluations.createIndex('bySource', 'sourceId', {unique:false});
        const audit = tx.objectStore('auditLog');
        audit.createIndex('bySource', 'sourceId', {unique:false});
        const candidates = tx.objectStore('discoveryCandidates');
        candidates.createIndex('byCanonicalUrl', 'canonicalUrl', {unique:true});
        candidates.createIndex('byStatus', 'status', {unique:false});
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Veritabanı açılamadı.'));
      request.onblocked = () => reject(new Error('Veritabanının eski sekmesini kapatıp tekrar dene.'));
    });
  }
  async function withDB(action) {
    const db = await openDB();
    try { return await action(db); } finally { db.close(); }
  }
  async function getAllFrom(db, storeName) {
    const tx = db.transaction(storeName, 'readonly');
    const result = await reqPromise(tx.objectStore(storeName).getAll());
    return result;
  }
  async function readAll() {
    return withDB(async db => {
      // Bütün depolar tek readonly transaction içinde okunur: tutarlı yedek anlık görüntüsü.
      const tx = db.transaction(STORES, 'readonly');
      const results = await Promise.all(STORES.map(name => reqPromise(tx.objectStore(name).getAll())));
      return Object.fromEntries(STORES.map((name, i) => [name, results[i]]));
    });
  }
  async function init() {
    return withDB(async db => {
      const tx = db.transaction('sourceTypes', 'readwrite');
      const store = tx.objectStore('sourceTypes');
      for (const item of TYPES) {
        const request = store.get(item.typeId);
        request.onsuccess = () => { if (!request.result) store.add(item); };
      }
      await txDone(tx);
      return true;
    });
  }
  function log(action, sourceId, detail) {
    return {auditId:uuid('log'), action, sourceId:sourceId || null, detail:text(detail).slice(0,800), occurredAt:now(), actor:'local_manual_test'};
  }
  function candidateInput(item) {
    const name = text(item?.name);
    if (name.length < 3 || name.length > 180) throw new Error('Kaynak adı 3–180 karakter olmalı.');
    const url = canonicalUrl(item?.url);
    const typeId = text(item?.typeId);
    if (!typeId) throw new Error('Kaynak türü seçilmeli.');
    return {name, url, canonicalUrl:url, typeId};
  }
  async function addCandidate(input) {
    const item = candidateInput(input);
    return withDB(async db => {
      const type = await reqPromise(db.transaction('sourceTypes').objectStore('sourceTypes').get(item.typeId));
      if (!type) throw new Error('Kaynak türü sözlükte bulunamadı.');
      const candidateExists = await reqPromise(db.transaction('discoveryCandidates').objectStore('discoveryCandidates').index('byCanonicalUrl').get(item.canonicalUrl));
      const channelExists = await reqPromise(db.transaction('channels').objectStore('channels').index('byCanonicalUrl').get(item.canonicalUrl));
      if (candidateExists || channelExists) throw new Error('Bu adres zaten adaylarda veya kayıtlı kaynak kanallarında bulunuyor.');
      const record = {...item, candidateId:uuid('cand'), status:'discovered', discoveredAt:now(), lastSeenAt:now()};
      const tx = db.transaction(['discoveryCandidates','auditLog'], 'readwrite');
      tx.objectStore('discoveryCandidates').add(record);
      tx.objectStore('auditLog').add({...log('candidate_added',null,`Aday: ${item.name} — ${item.url}`),candidateId:record.candidateId});
      await txDone(tx);
      return record;
    });
  }
  // v1.5: Adaylar doğrudan kaynağa dönüşmez. Ön inceleme kararı
  // bir kurumun kimliğinin doğrulandığı veya kullanım izninin alındığı anlamına gelmez.
  const CANDIDATE_TRANSITIONS = Object.freeze({
    discovered:['review','hold','rejected'],
    review:['ready','hold','rejected'],
    hold:['review','rejected'],
    ready:['review','hold','rejected'],
    rejected:['review']
  });
  async function setCandidateStatus(candidateId, newStatus, reason) {
    const id = text(candidateId), status = text(newStatus), note = text(reason);
    if (!id || !status) throw new Error('Aday ve inceleme kararı seçilmeli.');
    if (note.length < 15 || note.length > 500)
      throw new Error('İnceleme gerekçesi 15–500 karakter olmalı.');
    return withDB(async db => {
      const tx = db.transaction(['discoveryCandidates','auditLog'],'readwrite');
      const store = tx.objectStore('discoveryCandidates');
      const candidate = await reqPromise(store.get(id));
      if (!candidate) throw new Error('Aday bulunamadı veya kaynağa dönüştürüldü.');
      const allowed = CANDIDATE_TRANSITIONS[candidate.status] || [];
      if (!allowed.includes(status)) throw new Error('Bu aday için geçersiz durum geçişi.');
      const next = {...candidate,status,reviewReason:note,lastReviewedAt:now(),
        reviewPolicy:'manual_preflight_v1.5'};
      store.put(next);
      tx.objectStore('auditLog').add({...log('candidate_status_changed',null,
        `${candidate.name}: ${candidate.status} → ${status}. Gerekçe: ${note}`),
        candidateId:id,candidateOldStatus:candidate.status,candidateNewStatus:status,
        reviewDecision:'no_verification'});
      await txDone(tx);
      return next;
    });
  }
  function candidateHost(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./,''); }
    catch { return ''; }
  }
  function relatedHost(a,b) {
    return !!(a && b && (a === b || a.endsWith('.'+b) || b.endsWith('.'+a)));
  }
  async function promoteCandidate(candidateId) {
    const id = text(candidateId);
    if (!id) throw new Error('Aday seçilmedi.');
    return withDB(async db => {
      // Okumalar ve yazmalar aynı transaction içinde: araya başka kayıt giremez.
      const tx = db.transaction(['sources','channels','discoveryCandidates','auditLog'],'readwrite');
      const candidatesStore = tx.objectStore('discoveryCandidates');
      const [candidate,sources,channels,candidates] = await Promise.all([
        reqPromise(candidatesStore.get(id)),
        reqPromise(tx.objectStore('sources').getAll()),
        reqPromise(tx.objectStore('channels').getAll()),
        reqPromise(candidatesStore.getAll())
      ]);
      if (!candidate) throw new Error('Aday bulunamadı.');
      if (candidate.status !== 'ready' || !candidate.lastReviewedAt)
        throw new Error('Önce adayı gerekçeli inceleyip “Değerlendirme kaydına hazır” durumuna getir.');
      if (channels.some(ch => ch.canonicalUrl === candidate.canonicalUrl))
        throw new Error('Bu URL zaten kayıtlı bir yayın kanalında var. Dönüştürme yapılmadı.');
      const host = candidateHost(candidate.canonicalUrl);
      if (!host || !candidate.canonicalUrl.startsWith('https://') ||
          /^(localhost|.+\.localhost|.+\.local|.+\.internal|.+\.invalid|.+\.test|.+\.example|.+\.onion)$/.test(host))
        throw new Error('Bu adres yeni kaynak olarak dönüştürülmeden önce ayrıca güvenlik incelemesi gerektiriyor.');
      if (channels.some(ch => relatedHost(host,candidateHost(ch.canonicalUrl))) ||
          candidates.some(c => c.candidateId !== id && relatedHost(host,candidateHost(c.canonicalUrl))) ||
          sources.some(s => text(s.name).toLocaleLowerCase('tr-TR') === text(candidate.name).toLocaleLowerCase('tr-TR')))
        throw new Error('Mevcut kaynak/aday ile olası eşleşme var. Otomatik birleştirme veya dönüştürme yapılmadı.');
      const sourceId = uuid('src');
      const source = {
        sourceId,name:candidate.name,shortName:'',parentSourceId:null,
        primaryTypeId:candidate.typeId,secondaryTypeIds:[],sportIds:[],
        country:'',city:'',identityStatus:'unverified',qualityScore:null,
        sourceStatus:'evaluating',discoveredAt:candidate.discoveredAt,
        createdAt:now(),lastEvaluatedAt:null,nextReviewAt:null,
        policyVersion:'1.0',needsReverification:true,
        originCandidateId:id
      };
      const channel = {
        channelId:uuid('chn'),ownerSourceId:sourceId,channelType:'website',
        originalUrl:candidate.url,canonicalUrl:candidate.canonicalUrl,
        ownershipStatus:'unverified',accessStatus:'unknown',usageRights:'unknown',
        status:'pending',discoveredAt:now(),lastCheckedAt:null
      };
      tx.objectStore('sources').add(source);
      tx.objectStore('channels').add(channel);
      candidatesStore.delete(id);
      tx.objectStore('auditLog').add({...log('candidate_promoted',sourceId,
        `Aday ön incelemeden sonra DEĞERLENDİRME kaydına dönüştürüldü. ${candidate.reviewReason || ''} Kimlik ve kullanım hakları doğrulanmadı.`),
        candidateId:id,reviewDecision:'no_verification'});
      await txDone(tx);
      return source;
    });
  }
  async function seedExamples() {
    return withDB(async db => {
      const items = [
        {sourceId:'tyf',name:'Türkiye Yüzme Federasyonu',shortName:'TYF',url:'https://www.tyf.gov.tr',sport:'swimming',city:'Ankara'},
        {sourceId:'tbf',name:'Türkiye Basketbol Federasyonu',shortName:'TBF',url:'https://www.tbf.org.tr',sport:'basketball',city:'İstanbul'}
      ];
      const existing = new Set((await getAllFrom(db,'sources')).map(s => s.sourceId));
      const existingUrls = new Set((await getAllFrom(db,'channels')).map(c => c.canonicalUrl));
      const candidateUrls = new Set((await getAllFrom(db,'discoveryCandidates')).map(c => c.canonicalUrl));
      const tx = db.transaction(['sources','channels','auditLog'], 'readwrite');
      let added = 0;
      for (const item of items) {
        const canonical = canonicalUrl(item.url);
        // Aynı adres aday olarak bekliyorsa yeni bir kuruluş kaydı yaratma.
        if (existing.has(item.sourceId) || candidateUrls.has(canonical) || existingUrls.has(canonical)) continue;
        tx.objectStore('sources').add({
          sourceId:item.sourceId,name:item.name,shortName:item.shortName,parentSourceId:null,
          primaryTypeId:'national_federation',secondaryTypeIds:[],sportIds:[item.sport],
          country:'Türkiye',city:item.city,identityStatus:'unverified',qualityScore:null,
          sourceStatus:'evaluating',discoveredAt:now(),createdAt:now(),lastEvaluatedAt:null,
          nextReviewAt:null,policyVersion:'1.0',needsReverification:true
        });
        if (!existingUrls.has(canonical)) {
          tx.objectStore('channels').add({
            channelId:uuid('chn'), ownerSourceId:item.sourceId,channelType:'website',
            originalUrl:item.url,canonicalUrl:canonical,ownershipStatus:'unverified',
            accessStatus:'unknown',usageRights:'unknown',status:'pending',
            discoveredAt:now(),lastCheckedAt:null
          });
        }
        tx.objectStore('auditLog').add(log('sample_seeded',item.sourceId,'Başlangıç kaydı aktarıldı; doğrulama yapılmış sayılmaz.'));
        added++;
      }
      await txDone(tx);
      return added;
    });
  }
  async function addEvidence(input) {
    const sourceId = text(input?.sourceId);
    const claimType = text(input?.claimType);
    const issuer = text(input?.issuer);
    const evidenceUrl = canonicalUrl(input?.evidenceUrl);
    const level = text(input?.evidenceLevel);
    if (!sourceId || !['identity','ownership','authorization','usage_rights'].includes(claimType) ||
        !issuer || issuer.length > 180) {
      throw new Error('Geçerli kaynak, kanıt amacı ve kanıtı sağlayan kurum gerekli.');
    }
    if (!['A','B','C'].includes(level)) throw new Error('Kanıt seviyesi seçilmeli.');
    return withDB(async db => {
      // Kayıt kontrolü ve ekleme aynı readwrite transaction içinde gerçekleşir.
      // Şema ve veritabanı sürümü değiştirilmez; mevcut kanıt kayıtları silinmez.
      const tx = db.transaction(['sources','evidence','auditLog'],'readwrite');
      const sources = tx.objectStore('sources');
      const evidence = tx.objectStore('evidence');
      const source = await reqPromise(sources.get(sourceId));
      if (!source) throw new Error('İlgili kaynak bulunamadı.');
      if (source.sourceStatus === 'archived')
        throw new Error('Arşivdeki kaynağa kanıt eklemek için önce yeniden incelemeye al.');
      const existing = await reqPromise(evidence.index('bySource').getAll(sourceId));
      const duplicate = existing.some(item =>
        item.claimType === claimType && item.evidenceUrl === evidenceUrl
      );
      if (duplicate) throw new Error('Bu kaynağa aynı amaç ve web adresiyle kanıt zaten eklenmiş.');
      const record = {
        evidenceId:uuid('ev'),sourceId,claimType,issuer,evidenceUrl,evidenceLevel:level,
        result:'pending',verificationMethod:'manual_pending',checkedAt:null,
        addedAt:now(),policyVersion:'1.0'
      };
      evidence.add(record);
      tx.objectStore('auditLog').add(log('evidence_added',sourceId,
        `Kanıt adayı eklendi: ${claimType} (${level}). Henüz doğrulanmadı.`));
      await txDone(tx);
      return record;
    });
  }
  async function addEvaluation(input) {
    const sourceId = text(input?.sourceId), n = Number(input?.qualityScore);
    if (!sourceId || !Number.isInteger(n) || n < 0 || n > 100) throw new Error('Kaynak ve 0–100 arası tam sayı puanı gir.');
    return withDB(async db => {
      const source = await reqPromise(db.transaction('sources').objectStore('sources').get(sourceId));
      if (!source) throw new Error('Kaynak bulunamadı.');
      const evaluation = {
        evaluationId:uuid('eval'),sourceId,qualityScore:n,
        mode:'manual_draft',decision:'not_approved',
        reason:text(input?.reason).slice(0,500),evaluatedAt:now(),policyVersion:'1.0'
      };
      const next = {...source,qualityScore:n,lastEvaluatedAt:evaluation.evaluatedAt};
      const tx = db.transaction(['sources','evaluations','auditLog'],'readwrite');
      tx.objectStore('sources').put(next);
      tx.objectStore('evaluations').add(evaluation);
      tx.objectStore('auditLog').add(log('draft_score',sourceId,`Taslak puan: ${n}/100. Kabul kararı verilmedi.`));
      await txDone(tx);
      return evaluation;
    });
  }
  // Kaynak durumu kimlik doğrulaması değildir. v1.1 hiçbir kaynağı
  // accepted veya active yapmaz; yalnızca inceleme/askı/arşiv süreçlerini yönetir.
  const STATUS_TRANSITIONS = Object.freeze({
    evaluating:['review','suspended','archived'],
    review:['evaluating','suspended','archived'],
    suspended:['review','archived'],
    archived:['review'],
    accepted:['review','suspended','archived'],
    active:['review','suspended','archived']
  });
  async function setSourceStatus(sourceId, newStatus) {
    if (!['evaluating','review','suspended','archived'].includes(newStatus))
      throw new Error('Bu test sürümünde hedef durum desteklenmiyor.');
    return withDB(async db => {
      const tx = db.transaction(['sources','auditLog'],'readwrite');
      const store = tx.objectStore('sources');
      const source = await reqPromise(store.get(sourceId));
      if (!source) throw new Error('Kaynak bulunamadı.');
      const allowed = STATUS_TRANSITIONS[source.sourceStatus] || ['review'];
      if (!allowed.includes(newStatus))
        throw new Error('Bu durumdan istenen duruma doğrudan geçişe izin verilmiyor.');
      const next = {...source,sourceStatus:newStatus};
      store.put(next);
      tx.objectStore('auditLog').add(log('status_changed',sourceId,
        `${source.sourceStatus} → ${newStatus}`));
      await txDone(tx);
      return next;
    });
  }

  // v1.3: Bir inceleme NOTU kaynak/kanit dogrulamasi veya onay degildir.
  // Ayni IndexedDB auditLog deposuna eklenir; yeni store ve migration yok.
  const REVIEW_CHECK_IDS = Object.freeze([
    'type','sport','identity','ownership','access','rights','evidence','quality'
  ]);
  const REVIEW_NOTE_TYPES = Object.freeze([
    'research','document_missing','security_concern','general'
  ]);
  async function addReviewNote(input) {
    const sourceId = text(input?.sourceId);
    const checkId = text(input?.checkId);
    const noteType = text(input?.noteType);
    const detail = text(input?.note);
    if (!sourceId || !REVIEW_CHECK_IDS.includes(checkId))
      throw new Error('Inceleme kaynagi ve uygunluk kosulu secilmeli.');
    if (!REVIEW_NOTE_TYPES.includes(noteType))
      throw new Error('Gecerli bir inceleme notu turu sec.');
    if (detail.length < 15 || detail.length > 600)
      throw new Error('Inceleme aciklamasi 15-600 karakter olmali.');
    return withDB(async db => {
      const tx = db.transaction(['sources','auditLog'],'readwrite');
      const source = await reqPromise(tx.objectStore('sources').get(sourceId));
      if (!source) throw new Error('Incelenecek kaynak bulunamadi.');
      const entry = {
        ...log('review_note_added', sourceId, detail),
        reviewCheckId:checkId, noteType,
        reviewVersion:'1.3', reviewDecision:'no_approval'
      };
      tx.objectStore('auditLog').add(entry);
      await txDone(tx);
      return entry;
    });
  }

  async function sha256(message) {
    if (!global.crypto?.subtle) throw new Error('SHA-256 için sayfayı HTTPS veya localhost üzerinden açmalısın.');
    const bytes = new TextEncoder().encode(message);
    const digest = await global.crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
  }
  async function exportBackup() {
    const data = await readAll();
    for (const key of STORES) data[key].sort((a,b) => String(a[KEYS[key]]).localeCompare(String(b[KEYS[key]])));
    const counts = Object.fromEntries(STORES.map(key => [key,data[key].length]));
    const payload = {format:FORMAT,schemaVersion:1,exportedAt:now(),counts,data};
    const checksum = 'sha256:' + await sha256(JSON.stringify(payload));
    return { ...payload, checksum };
  }
  async function validateBackup(backup) {
    if (!backup || typeof backup !== 'object' || backup.format !== FORMAT || backup.schemaVersion !== 1)
      throw new Error('Dosya SporNRD Kaynak Havuzu v1 yedeği değil.');
    if (!backup.data || typeof backup.data !== 'object') throw new Error('Yedek verileri eksik.');
    let count = 0;
    for (const key of STORES) {
      const list = backup.data[key];
      if (!Array.isArray(list)) throw new Error(`${key} kayıt listesi eksik.`);
      count += list.length;
      const ids = new Set();
      for (const item of list) {
        const id = item?.[KEYS[key]];
        if (!item || typeof item !== 'object' || typeof id !== 'string' || !id || id.length > 200 || ids.has(id))
          throw new Error(`${key} içinde geçersiz veya tekrar eden kimlik.`);
        ids.add(id);
        if ((key === 'channels' || key === 'discoveryCandidates') && canonicalUrl(item.canonicalUrl) !== item.canonicalUrl)
          throw new Error(`${key}: kanonik URL geçersiz.`);
      }
    }
    if (count > MAX_TOTAL_RECORDS) throw new Error('Yedek bu test sürümünün kayıt sınırını aşıyor.');
    const {checksum, ...payload} = backup;
    if (!/^sha256:[a-f0-9]{64}$/.test(String(checksum || '')) ||
        checksum !== 'sha256:' + await sha256(JSON.stringify(payload)))
      throw new Error('Yedek SHA-256 bütünlük doğrulamasından geçemedi.');
    for (const key of STORES) {
      if (backup.counts?.[key] !== backup.data[key].length) throw new Error('Yedek kayıt sayıları uyuşmuyor.');
    }
    return {count, counts:backup.counts, exportedAt:backup.exportedAt};
  }
  function safeImportedRecord(store, item) {
    const record = {...item};
    if (store === 'sources') {
      record.sourceStatus = 'review';
      record.identityStatus = 'unverified';
      record.needsReverification = true;
    }
    if (store === 'channels') {
      record.status = 'pending';
      record.ownershipStatus = 'unverified';
      record.accessStatus = 'unknown';
      record.usageRights = 'unknown';
    }
    if (store === 'evidence') {
      record.result = 'pending';
      record.verificationMethod = 'restore_pending';
      record.checkedAt = null;
    }
    if (store === 'evaluations') record.decision = 'not_approved';
    return record;
  }
  function validateLinks(data) {
    const ids = new Set(data.sources.map(s => s.sourceId));
    const typeIds = new Set(data.sourceTypes.map(s => s.typeId));
    const owners = new Map(data.sources.map(s => [s.sourceId,s.parentSourceId]));
    for (const source of data.sources) {
      if (source.parentSourceId && !ids.has(source.parentSourceId)) throw new Error('Üst kuruluş referansı eksik.');
      if (source.primaryTypeId && !typeIds.has(source.primaryTypeId)) throw new Error('Kaynak türü sözlükte bulunamadı.');
      const seen = new Set([source.sourceId]);
      let parent = source.parentSourceId;
      while (parent) {
        if (seen.has(parent)) throw new Error('Alt kuruluş hiyerarşisinde döngü var.');
        seen.add(parent);parent = owners.get(parent);
      }
    }
    for (const store of ['channels','evidence','evaluations']) {
      for (const item of data[store]) {
        if (!ids.has(store === 'channels' ? item.ownerSourceId : item.sourceId))
          throw new Error(`${store}: bağlı kuruluş bulunamadı.`);
      }
    }
    for (const c of data.discoveryCandidates) if (!typeIds.has(c.typeId)) throw new Error('Aday kaynak türü eksik.');
    const allChannels = new Set();
    for (const ch of data.channels) {
      if (allChannels.has(ch.canonicalUrl)) throw new Error('Birden fazla kanal aynı kanonik URL ile kayıtlı.');
      allChannels.add(ch.canonicalUrl);
    }
    const allCandidates = new Set();
    for (const c of data.discoveryCandidates) {
      if (allCandidates.has(c.canonicalUrl) || allChannels.has(c.canonicalUrl))
        throw new Error('Aday/kanal URL kayıtları arasında mükerrerlik var.');
      allCandidates.add(c.canonicalUrl);
    }
  }
  async function previewImport(backup, mode = 'merge') {
    await validateBackup(backup);
    if (!['merge','replace'].includes(mode)) throw new Error('Bilinmeyen geri yükleme türü.');
    const current = mode === 'merge' ? await readAll() : Object.fromEntries(STORES.map(k => [k,[]]));
    const merged = {};
    const added = {};
    for (const store of STORES) {
      const map = new Map(current[store].map(item => [item[KEYS[store]],item]));
      let newCount = 0;
      for (const item of backup.data[store]) {
        if (map.has(item[KEYS[store]])) continue;
        map.set(item[KEYS[store]], safeImportedRecord(store,item));
        newCount++;
      }
      merged[store] = [...map.values()];
      added[store] = newCount;
    }
    validateLinks(merged);
    return {mode,added,total:Object.fromEntries(STORES.map(k=>[k,merged[k].length])),merged};
  }
  async function importBackup(backup, mode = 'merge') {
    const preview = await previewImport(backup, mode);
    return withDB(async db => {
      const tx = db.transaction(STORES,'readwrite');
      if (mode === 'replace') for (const store of STORES) tx.objectStore(store).clear();
      // Bütün veri depoları tek işlem içinde yazılır; hata olursa tamamı geri alınır.
      for (const store of STORES) {
        for (const item of preview.merged[store]) tx.objectStore(store).put(item);
      }
      tx.objectStore('auditLog').put(log('backup_restored',null,
        `JSON yedeği geri yüklendi (${mode}). Dışarıdan alınan kaynak/kanal/kanıtlar yeniden doğrulanmalı.`));
      await txDone(tx);
      return preview;
    });
  }

  global.SPORNRD_SOURCE_POOL = Object.freeze({
    DB_NAME, DB_VERSION, STORES, init, readAll, addCandidate, promoteCandidate,
    seedExamples, addEvidence, addEvaluation, setSourceStatus, addReviewNote, setCandidateStatus,
    exportBackup, validateBackup, previewImport, importBackup, canonicalUrl,
    MAX_BACKUP_BYTES
  });
})(window);
