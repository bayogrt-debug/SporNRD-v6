/* SporNRD v1.5 · bağımsız test sayfası kontrolcüsü.
   Dış servise hiçbir istek gönderilmez.
*/
(function () {
  'use strict';
  const api = window.SPORNRD_SOURCE_POOL;
  const reviewEngine = window.SPORNRD_REVIEW_ENGINE;
  const discoveryEngine = window.SPORNRD_DISCOVERY_ENGINE;
  const $ = id => document.getElementById(id);
  let backupToRestore = null;
  let backupMode = null;
  let pendingPlan = null;
  let busy = false;
  let selectedSourceId = '';
  let lastSnapshot = null;
  let pendingDiscovery = null;
  let selectedCandidateFilter = 'all';
  const CANDIDATE_LABELS = {
    discovered:'Keşfedildi', review:'İncelemede', hold:'Bekletildi',
    ready:'Değerlendirme kaydına hazır', rejected:'Reddedildi'
  };
  const CANDIDATE_NEXT = {
    discovered:[['review','İncelemeye al'],['hold','Beklet'],['rejected','Reddet']],
    review:[['ready','Değerlendirme kaydına hazır'],['hold','Beklet'],['rejected','Reddet']],
    hold:[['review','İncelemeyi sürdür'],['rejected','Reddet']],
    ready:[['review','Yeniden incele'],['hold','Beklet'],['rejected','Reddet']],
    rejected:[['review','Yeniden incele']]
  };
  function renderCandidateQueue(data,typeName) {
    const list = data.discoveryCandidates.slice().sort((a,b) =>
      String(b.discoveredAt || '').localeCompare(String(a.discoveredAt || '')));
    const filter = $('candidateStatusFilter');
    if (filter) { filter.value = selectedCandidateFilter; }
    const visible = list.filter(c => selectedCandidateFilter === 'all' || c.status === selectedCandidateFilter);
    $('candidateQueueSummary').textContent = `${list.length} aday · ${list.filter(c => c.status === 'review').length} incelemede · ${list.filter(c => c.status === 'ready').length} değerlendirme kaydına hazır`;
    $('candidateList').innerHTML = visible.length ? visible.map(c => {
      const id = esc(c.candidateId);
      const history = data.auditLog.filter(a => a.candidateId === c.candidateId)
        .sort((a,b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || ''))).slice(0,4);
      const options = (CANDIDATE_NEXT[c.status] || []).map(([value,label]) =>
        `<option value="${esc(value)}">${esc(label)}</option>`).join('');
      return `<div class="record candidate-record">
        <div class="row"><b>${esc(c.name)}</b><span class="pill ${c.status === 'ready' ? 'okay' : 'alert'}">${esc(CANDIDATE_LABELS[c.status] || c.status)}</span></div>
        <p>${esc(typeName.get(c.typeId) || c.typeId)}</p>
        <p class="mono link-text">${esc(c.canonicalUrl)}</p>
        <p class="inline-note">Bu adayın kimliği, sporla ilişkisi, kanal sahipliği veya kullanım hakkı doğrulanmış değildir.</p>
        ${c.reviewReason ? `<p>Son inceleme gerekçesi: ${esc(c.reviewReason)}</p>` : ''}
        ${c.status === 'ready' ? `<button class="btn alt" data-promote="${id}" type="button">Değerlendirilecek Kaynağa Dönüştür</button>` : ''}
        <details class="candidate-review"><summary>İnceleme kararı ve geçmişi</summary>
          ${options ? `<label>Sonraki aday durumu<select data-candidate-next="${id}">${options}</select></label>
          <label>Gerekçe (15–500 karakter)<textarea data-candidate-reason="${id}" maxlength="500" minlength="15" placeholder="Örnek: Kuruluşun adresi yerel testte ön incelendi; gerçek kimlik doğrulaması yapılmadı."></textarea></label>
          <button class="btn alt" type="button" data-candidate-decide="${id}">Gerekçeli Kararı Kaydet</button>` : '<p>Bu adayın durumu şu anda değiştirilemiyor.</p>'}
          <h3>Son aday işlemleri</h3>
          ${history.length ? history.map(a => `<div class="candidate-history"><b>${esc(a.action)}</b><p>${esc(a.detail)}</p><p>${esc(displayDate(a.occurredAt))}</p></div>`).join('') : '<p class="muted">Bu aday için yeni sürümde henüz ayrıntılı geçmiş yok. Önceki genel denetim kayıtları korunur.</p>'}
        </details>
      </div>`;
    }).join('') : '<div class="empty">Bu durumda aday bulunamadı.</div>';
  }
  const CLAIM_NAMES = {identity:'Kuruluş kimliği',ownership:'Kanal sahipliği',
    authorization:'Yetki / ruhsat',usage_rights:'Kullanım hakkı'};
  const REVIEW_CHECK_NAMES = {
    type:'Kaynak türü',sport:'Sporla ilgisi',identity:'Kuruluş kimliği',
    ownership:'Kanal sahipliği',access:'İzinli/güvenli erişim',
    rights:'İçerik kullanım hakkı',evidence:'Kanıta dayalı inceleme',
    quality:'Onaylı kalite değerlendirmesi'
  };
  const NOTE_TYPE_NAMES = {
    research:'Araştırma bekliyor',document_missing:'Belge eksik',
    security_concern:'Güvenlik şüphesi',general:'Genel not'
  };
  const STATUS_BUTTONS = {
    evaluating:[['review','İncele'],['suspended','Askıya Al'],['archived','Arşivle']],
    review:[['evaluating','Değerlendirmeye Al'],['suspended','Askıya Al'],['archived','Arşivle']],
    suspended:[['review','Yeniden İncele'],['archived','Arşivle']],
    archived:[['review','Yeniden İncelemeye Al']],
    accepted:[['review','İncele'],['suspended','Askıya Al'],['archived','Arşivle']],
    active:[['review','İncele'],['suspended','Askıya Al'],['archived','Arşivle']]
  };
  function statusButtons(source) {
    return (STATUS_BUTTONS[source.sourceStatus] || [['review','İncele']])
      .map(([value,label]) => `<button class="btn ${value === 'suspended' || value === 'archived' ? 'danger' : 'weak'}"
         data-set-status="${value}" data-source-id="${esc(source.sourceId)}"
         type="button">${label}</button>`).join('');
  }
  function displayDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString('tr-TR') : 'Henüz yok';
  }
  function evidenceFingerprint(item) {
    return JSON.stringify([item.sourceId,item.claimType,item.evidenceUrl]);
  }
  function renderEvidenceList(data, names) {
    const chosen = $('evidenceFilter').value;
    const sorted = data.evidence.slice().sort((a,b) =>
      String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
    // Eski aynı kanıtlar değiştirilmez; tüm kopyalar "tekrar" olarak işaretlenir.
    const countByKey = new Map();
    for (const e of data.evidence) {
      const key = evidenceFingerprint(e);
      countByKey.set(key,(countByKey.get(key) || 0) + 1);
    }
    const visible = sorted.filter(e => !chosen || e.sourceId === chosen);
    $('evidenceCount').textContent = String(data.evidence.length);
    $('evidenceList').innerHTML = visible.length ? visible.map(e => {
      const duplicate = countByKey.get(evidenceFingerprint(e)) > 1;
      return `<div class="record"><div class="row"><b>${esc(names.get(e.sourceId) || e.sourceId)}</b>
        ${safeTag(e.evidenceLevel || '?')}${duplicate ? '<span class="pill alert">Eski tekrar</span>' : ''}</div>
        <p>Kanıt amacı: ${esc(CLAIM_NAMES[e.claimType] || e.claimType || '-')}</p>
        <p>Sağlayan: ${esc(e.issuer || '-')} · Durum: ${esc(e.result === 'pending' ? 'Doğrulanmadı' : (e.result || 'Belirsiz'))}</p>
        <p class="mono link-text">${esc(e.evidenceUrl || '')}</p>
        <p>Eklenme: ${esc(displayDate(e.addedAt))}</p></div>`;
    }).join('') : '<div class="empty">Bu filtrede kanıt bulunamadı.</div>';
  }
  function reviewNotesFor(data, sourceId) {
    return data.auditLog.filter(item =>
      item.sourceId === sourceId && item.action === 'review_note_added'
    ).sort((a,b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
  }
  function renderReviewNotes(data) {
    const sourceId = $('reviewNoteSource').value;
    const list = $('reviewNoteList');
    if (!sourceId) {
      list.innerHTML = '<div class="empty">İnceleme notlarını görmek için kaynak seç.</div>';
      return;
    }
    const notes = reviewNotesFor(data,sourceId);
    list.innerHTML = notes.length ? notes.map(item => `
      <div class="record review-note-item">
        <div class="row"><b>${esc(REVIEW_CHECK_NAMES[item.reviewCheckId] || item.reviewCheckId || 'İnceleme')}</b>
          <span class="pill alert">${esc(NOTE_TYPE_NAMES[item.noteType] || 'İnceleme notu')}</span></div>
        <p>${esc(item.detail)}</p><p>${esc(displayDate(item.occurredAt))} · Onay değildir</p>
      </div>`).join('') : '<div class="empty">Bu kaynak için henüz inceleme notu yok.</div>';
  }
  function buildDossierText(data,sourceId) {
    const source = data.sources.find(s => s.sourceId === sourceId);
    if (!source) throw new Error('Önce bir kaynak seç.');
    const report = reviewEngine.reportFor(data,sourceId);
    const notes = reviewNotesFor(data,sourceId);
    return [
      'SPORNRD · KAYNAK İNCELEME ÖZETİ (YEREL TEST v1.3)',
      'UYARI: Gerçek kimlik/kanal doğrulaması veya kabul kararı değildir.',
      'Tam IndexedDB/JSON yedeği değildir.',
      '',
      'Kaynak: ' + source.name,
      'Kaynak ID: ' + source.sourceId,
      'Kayıt durumu: ' + niceStatus(source.sourceStatus),
      'Ön koşullar: ' + report.passed + '/' + report.total,
      'Taslak puan: ' + (report.draftScore == null ? 'Yok' : report.draftScore + '/100 (onaysız)'),
      'Sonuç: ' + report.conclusion,
      '',
      'SEKİZ ÖN KOŞUL',
      ...report.checks.map((c,i) => (i+1) + '. ' + c.label + ': ' +
        (c.passed ? 'KAYIT KOŞULU SAĞLANDI' : 'EKSİK / DOĞRULANMADI') + '\n   ' + c.explanation),
      '',
      'İNCELEME NOTLARI (' + notes.length + ')',
      ...(notes.length ? notes.map((n,i) =>
        (i+1) + '. ' + (REVIEW_CHECK_NAMES[n.reviewCheckId] || n.reviewCheckId) +
        ' / ' + (NOTE_TYPE_NAMES[n.noteType] || 'Not') + '\n' +
        '   ' + n.detail + '\n   ' + displayDate(n.occurredAt)) : ['Henüz not yok.']),
      '', 'Yayın, kaynak kabulü ve içerik kullanımı için ayrıca yetkili doğrulama gerekir.'
    ].join('\n');
  }
  function discoveryInput(form) {
    return Object.fromEntries(new FormData(form).entries());
  }
  function discoverySignature(input) {
    return JSON.stringify([String(input.name || '').trim(), String(input.url || '').trim(),
      String(input.typeId || '').trim()]);
  }
  function invalidateDiscovery(clearResult = true) {
    pendingDiscovery = null;
    $('saveDiscoveryCandidate').disabled = true;
    if (clearResult) $('discoveryResult').innerHTML = '<div class="empty">Ön kontrol için kaynak adı, türü ve adresi gir.</div>';
  }
  function renderDiscoveryReport(report) {
    const css = report.decision === 'new_source' ? 'okay' : 'alert';
    const decisionLabels = {
      duplicate:'Mükerrer adres', possible_channel:'Kanal eşleşmesi',
      manual_review:'Elle inceleme', new_source:'Yeni aday'
    };
    const linked = report.matchedSources.length
      ? '<p>İlgili mevcut kaynaklar: ' + report.matchedSources.map(s => esc(s.name)).join(' · ') + '</p>'
      : '<p>Mevcut kaynakla kesin ilişki kaydı yok.</p>';
    const warnings = report.riskFlags.length
      ? '<div class="notice">' + report.riskFlags.map(x => '<p>' + esc(x) + '</p>').join('') + '</div>' : '';
    $('discoveryResult').innerHTML = `<div class="record">
      <div class="row"><b>${esc(report.title)}</b><span class="pill ${css}">${esc(decisionLabels[report.decision])}</span></div>
      <p>${esc(report.reason)}</p>
      <p>Olası kanal türü: <b>${esc(report.channelLabel)}</b> (URL biçiminden tahmin)</p>
      <p>Normalleştirilmiş adres:</p><p class="mono link-text">${esc(report.canonicalUrl)}</p>
      ${linked}${warnings}
      <p class="inline-note">${esc(report.verification)}</p>
      <p class="inline-note">Yeni kuruluş profili, yayın kanalı, haber veya otomatik onay oluşturulmaz.</p>
      </div>`;
    $('saveDiscoveryCandidate').disabled = !report.mayAddCandidate;
  }
  function renderReviewSummary(data) {
    const container = $('reviewSummary');
    const sources = data.sources.slice().sort((a,b) => a.name.localeCompare(b.name,'tr'));
    container.innerHTML = sources.length ? sources.map(source => {
      const report = reviewEngine.reportFor(data, source.sourceId);
      const missing = report.checks.filter(c => !c.passed).map(c => c.label);
      const summary = missing.length ? missing.slice(0,3).join(' · ') +
        (missing.length > 3 ? ` · +${missing.length - 3} eksik` : '') : 'İnceleme koşulları tamam görünüyor';
      return `<div class="record"><div class="row"><b>${esc(source.name)}</b>
        <span class="pill alert">Ön kontrol ${report.passed}/${report.total}</span></div>
        <p>${esc(report.conclusion)}</p>
        <p class="inline-note">${esc(summary)}</p>
        ${report.draftScore == null ? '' : `<p>Manuel taslak puan: ${esc(report.draftScore)}/100 (kabul değil)</p>`}
        <button class="btn alt" type="button" data-detail-source="${esc(source.sourceId)}">Eksikleri Gör</button>
      </div>`;
    }).join('') : '<div class="empty">İncelenecek kaynak bulunamadı.</div>';
  }
  function renderReviewDetails(data, sourceId) {
    const report = reviewEngine.reportFor(data,sourceId);
    return `<h3 class="source-detail-subhead">Uygunluk ön kontrolü (${report.passed}/${report.total})</h3>
      <div class="notice"><b>Bu bir kabul/kalite puanı değildir.</b> Kontrol sadece mevcut yerel
      kayıtların eksiklerini gösterir. Harici doğrulama yapmaz; kaydı onaylamaz.</div>
      <div class="record"><b>${esc(report.conclusion)}</b>
      ${report.checks.map(check => `<div class="review-check">
        <div class="row"><b>${esc(check.label)}</b>
          <span class="pill ${check.passed ? 'okay' : 'alert'}">${check.passed ? 'Kayıt koşulu sağlandı' : 'Eksik / doğrulanmadı'}</span></div>
        <p>${esc(check.explanation)}</p>
      </div>`).join('')}</div>`;
  }
  function renderSourceDetail(data, typeNames) {
    const panel = $('sourceDetailPanel');
    const s = data.sources.find(source => source.sourceId === selectedSourceId);
    if (!s) {selectedSourceId = '';panel.hidden = true;return;}
    panel.hidden = false;
    const channels = data.channels.filter(c => c.ownerSourceId === s.sourceId);
    const evidence = data.evidence.filter(e => e.sourceId === s.sourceId);
    const evaluations = data.evaluations.filter(e => e.sourceId === s.sourceId)
      .sort((a,b) => String(b.evaluatedAt || '').localeCompare(String(a.evaluatedAt || '')));
    const actions = data.auditLog.filter(e => e.sourceId === s.sourceId)
      .sort((a,b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
    const parent = data.sources.find(other => other.sourceId === s.parentSourceId);
    $('sourceDetail').innerHTML = `
      <div class="record"><div class="row"><b>${esc(s.name)}</b>${safeTag(niceStatus(s.sourceStatus))}</div>
      <p>Kaynak ID: <span class="mono">${esc(s.sourceId)}</span></p>
      <p>Tür: ${esc(typeNames.get(s.primaryTypeId) || s.primaryTypeId || 'Belirtilmedi')}</p>
      <p>Bağlı kurum: ${esc(parent?.name || '-')} · İl: ${esc(s.city || '-')}</p>
      <p>Kimlik: ${esc(s.identityStatus === 'verified' ? 'Doğrulanmış kaydı var' : 'Doğrulanmadı')}</p>
      <p>Taslak puan: ${s.qualityScore == null ? 'Ölçülmedi' : esc(s.qualityScore + '/100')}</p>
      <p>İlk keşif: ${esc(displayDate(s.discoveredAt))}</p>
      <div class="actions">${statusButtons(s)}</div></div>
      ${renderReviewDetails(data,s.sourceId)}
      <h3 class="source-detail-subhead">Yayın kanalları (${channels.length})</h3>
      ${channels.length ? channels.map(c => `<div class="record"><b>${esc(c.channelType || 'website')}</b>
         <p class="mono link-text">${esc(c.canonicalUrl)}</p>
         <p>Sahiplik: ${esc(c.ownershipStatus || 'unverified')} · Erişim: ${esc(c.accessStatus || 'unknown')}</p>
         <p>Kullanım hakkı: ${esc(c.usageRights || 'unknown')}</p></div>`).join('')
         : '<div class="empty">Henüz kanal yok.</div>'}
      <h3 class="source-detail-subhead">Doğrulama kanıtları (${evidence.length})</h3>
      ${evidence.length ? evidence.map(e => `<div class="record"><b>${esc(CLAIM_NAMES[e.claimType] || e.claimType)} · ${esc(e.evidenceLevel)}</b>
        <p>Sağlayan: ${esc(e.issuer)} · ${esc(e.result === 'pending' ? 'Doğrulanmadı' : e.result)}</p>
        <p class="mono link-text">${esc(e.evidenceUrl)}</p></div>`).join('')
         : '<div class="empty">Henüz kanıt yok.</div>'}
      <h3 class="source-detail-subhead">Taslak değerlendirmeler (${evaluations.length})</h3>
      ${evaluations.length ? evaluations.map(e => `<div class="record"><b>${esc(e.qualityScore)}/100 · Taslak</b>
        <p>${esc(e.reason || 'Gerekçe belirtilmedi')}</p><p>${esc(displayDate(e.evaluatedAt))}</p></div>`).join('')
         : '<div class="empty">Henüz değerlendirme yok.</div>'}
      <h3 class="source-detail-subhead">İşlem geçmişi (${actions.length})</h3>
      ${actions.length ? actions.map(a => `<div class="record"><b>${esc(a.action)}</b>
        <p>${esc(a.detail)}</p><p>${esc(displayDate(a.occurredAt))}</p></div>`).join('')
         : '<div class="empty">Henüz kayıt yok.</div>'}`;
  }
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function message(msg, kind = '') {
    const element = $('status');
    element.textContent = msg;
    element.className = 'status ' + kind;
  }
  async function task(callback) {
    if (busy) return;
    busy = true;
    try { await callback(); }
    catch (err) { console.error(err); message(err?.message || 'Beklenmedik hata oluştu.', 'error'); }
    finally { busy = false; }
  }
  function niceStatus(status) {
    return ({evaluating:'Değerlendiriliyor',review:'İncelemede',suspended:'Askıda',archived:'Arşivlendi',
      accepted:'Kabul',active:'Aktif',discovered:'Keşfedildi'})[status] || status || 'Bilinmiyor';
  }
  function safeTag(tag) {return `<span class="pill">${esc(tag)}</span>`;}
  function getFormObject(form) {return Object.fromEntries(new FormData(form).entries());}
  function invalidateImport() {
    pendingPlan = null; backupMode = null;
    $('importBackup').disabled = true;
    $('importSummary').textContent = '';
  }
  async function refresh() {
    const data = await api.readAll();
    lastSnapshot = data;
    $('statSources').textContent = data.sources.length;
    $('statCandidates').textContent = data.discoveryCandidates.length;
    $('statChannels').textContent = data.channels.length;
    $('secondaryStats').textContent = `${data.evidence.length} kanıt adayı · ${data.evaluations.length} değerlendirme · ${data.auditLog.length} işlem kaydı · ${data.sourceTypes.length} tür`;

    const typeName = new Map(data.sourceTypes.map(t => [t.typeId,t.name]));
    const list = data.sourceTypes.slice().sort((a,b) => a.name.localeCompare(b.name,'tr'));
    $('candidateType').innerHTML = '<option value="">Kaynak türünü seç</option>' + list.map(t =>
      `<option value="${esc(t.typeId)}">${esc(t.parentTypeId ? '↳ ' : '')}${esc(t.name)}</option>`).join('');
    const discoverySelect = $('discoveryType');
    const selectedDiscoveryType = discoverySelect.value;
    discoverySelect.innerHTML = '<option value="">Kaynak türünü seç</option>' + list.map(t =>
      `<option value="${esc(t.typeId)}">${esc(t.parentTypeId ? '↳ ' : '')}${esc(t.name)}</option>`).join('');
    if ([...discoverySelect.options].some(o => o.value === selectedDiscoveryType))
      discoverySelect.value = selectedDiscoveryType;

    renderCandidateQueue(data,typeName);

    const channelsByOwner = new Map();
    for (const channel of data.channels) {
      const row = channelsByOwner.get(channel.ownerSourceId) || [];
      row.push(channel);channelsByOwner.set(channel.ownerSourceId,row);
    }
    const evidenceCount = new Map();
    for (const e of data.evidence) evidenceCount.set(e.sourceId,(evidenceCount.get(e.sourceId) || 0) + 1);
    const sortedSources = data.sources.slice().sort((a,b) => a.name.localeCompare(b.name,'tr'));
    const sourceNames = new Map(sortedSources.map(s => [s.sourceId,s.name]));
    $('sourceList').innerHTML = sortedSources.length ? sortedSources.map(s => {
      const channels = channelsByOwner.get(s.sourceId) || [];
      return `<div class="record">
        <div class="row"><b>${esc(s.name)}</b>${safeTag(niceStatus(s.sourceStatus))}</div>
        <p>${esc(typeName.get(s.primaryTypeId) || s.primaryTypeId)} · ${esc(s.city || 'Konum belirtilmedi')}</p>
        <p>Kimlik: ${safeTag(s.identityStatus === 'verified' ? 'Doğrulama kaydı var' : 'Doğrulanmadı')} · ${channels.length} kanal · ${evidenceCount.get(s.sourceId) || 0} kanıt adayı</p>
        <p>Taslak puan: ${s.qualityScore == null ? 'Ölçülmedi' : esc(s.qualityScore + '/100')}</p>
        ${channels.map(ch => `<p class="mono">↳ ${esc(ch.canonicalUrl)} · Erişim/izin: kontrol bekliyor</p>`).join('')}
        <div class="actions"><button class="btn alt" data-detail-source="${esc(s.sourceId)}" type="button">Kaynak Detayları</button>${statusButtons(s)}</div>
      </div>`;
    }).join('') : '<div class="empty">Henüz kayıtlı kuruluş yok.</div>';
    renderReviewSummary(data);

    const evidenceFilter = $('evidenceFilter');
    const existingEvidenceFilter = evidenceFilter.value;
    evidenceFilter.innerHTML = '<option value="">Tüm kaynaklar</option>' + sortedSources.map(s =>
      `<option value="${esc(s.sourceId)}">${esc(s.name)}</option>`).join('');
    if ([...evidenceFilter.options].some(o => o.value === existingEvidenceFilter)) {
      evidenceFilter.value = existingEvidenceFilter;
    }
    renderEvidenceList(data,sourceNames);
    renderSourceDetail(data,typeName);

    for (const select of document.querySelectorAll('.source-picker')) {
      const chosen = select.value;
      select.innerHTML = '<option value="">Kaynak seç</option>' + sortedSources.map(s =>
        `<option value="${esc(s.sourceId)}">${esc(s.name)}</option>`).join('');
      if ([...select.options].some(o => o.value === chosen)) select.value = chosen;
    }
    renderReviewNotes(data);
    const audit = data.auditLog.slice().sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,30);
    $('auditList').innerHTML = audit.length ? audit.map(item =>
      `<div class="record"><b>${esc(item.action)}</b><p>${esc(item.detail)}</p>
      <p>${esc(item.sourceId || 'genel')} · ${esc(item.occurredAt)}</p></div>`).join('')
      : '<div class="empty">Henüz işlem kaydı yok.</div>';
  }
  function toDownload(object) {
    const blob = new Blob([JSON.stringify(object,null,2)],{type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'SporNRD-kaynak-havuzu-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }
  async function readBackupFile() {
    const file = $('backupFile').files?.[0];
    if (!file) throw new Error('Önce bir JSON yedek dosyası seç.');
    if (file.size > api.MAX_BACKUP_BYTES) throw new Error('Yedek dosyası 12 MB sınırını aşıyor.');
    try {return JSON.parse(await file.text());}
    catch {throw new Error('JSON yedek okunamadı. Dosya bozuk olabilir.');}
  }
  function bind() {
    $('refresh').addEventListener('click', () => task(async () => {await refresh();message('Kayıtlar yenilendi.','success');}));
    $('candidateStatusFilter').addEventListener('change', event => {
      selectedCandidateFilter = event.currentTarget.value;
      if (lastSnapshot) renderCandidateQueue(lastSnapshot,
        new Map(lastSnapshot.sourceTypes.map(t => [t.typeId,t.name])));
    });
    $('discoveryForm').addEventListener('input',() => invalidateDiscovery());
    $('discoveryForm').addEventListener('change',() => invalidateDiscovery());
    $('discoveryForm').addEventListener('submit', event => {
      event.preventDefault();
      task(async () => {
        const input = discoveryInput($('discoveryForm'));
        const snapshot = await api.readAll();
        const report = discoveryEngine.report(input,snapshot,api.canonicalUrl);
        pendingDiscovery = {report, signature:discoverySignature(input)};
        renderDiscoveryReport(report);
        message('Keşif ön kontrolü tamamlandı. Hiçbir siteye bağlanılmadı ve kayıt değiştirilmedi.','success');
      });
    });
    $('saveDiscoveryCandidate').addEventListener('click',() => task(async () => {
      const input = discoveryInput($('discoveryForm'));
      if (!pendingDiscovery || pendingDiscovery.signature !== discoverySignature(input))
        throw new Error('Form değişti. Önce yeniden ön kontrol yap.');
      // Kayıt anında tekrar kontrol: eski ekran sonuçlarıyla aday eklenmesin.
      const current = await api.readAll();
      const rechecked = discoveryEngine.report(input,current,api.canonicalUrl);
      if (!rechecked.mayAddCandidate || rechecked.canonicalUrl !== pendingDiscovery.report.canonicalUrl)
        throw new Error('Kaynak havuzu değişmiş veya adres artık uygun değil. Yeniden ön kontrol yap.');
      if (!confirm('Bu adresi yalnızca DOĞRULANMAMIŞ yeni keşif ADAYI olarak kaydetmek istiyor musun?')) return;
      const candidate = await api.addCandidate(input);
      await refresh();
      $('discoveryForm').reset(); invalidateDiscovery();
      message(candidate.name + ' yalnızca keşif aday havuzuna kaydedildi. Kimlik, haklar ve güvenilirlik doğrulanmadı.','success');
    }));
    $('evidenceFilter').addEventListener('change',() => {
      if (!lastSnapshot) return;
      const names = new Map(lastSnapshot.sources.map(s => [s.sourceId,s.name]));
      renderEvidenceList(lastSnapshot,names);
    });
    $('closeSourceDetail').addEventListener('click',() => {
      selectedSourceId = '';$('sourceDetailPanel').hidden = true;
    });
    $('reviewNoteSource').addEventListener('change',() => {
      if (!lastSnapshot) return;
      renderReviewNotes(lastSnapshot);
      $('reviewDossierText').value = '';
    });
    $('reviewNoteForm').addEventListener('submit',event => {
      event.preventDefault();
      const form = event.currentTarget;
      task(async () => {
        const note = await api.addReviewNote(getFormObject(form));
        $('reviewNoteText').value = '';
        await refresh();
        $('reviewDossierText').value = '';
        message('İnceleme notu kaydedildi. Kaynak doğrulanmadı veya onaylanmadı.', 'success');
      });
    });
    $('buildReviewDossier').addEventListener('click', () => task(async () => {
      if (!lastSnapshot) throw new Error('Kaynaklar henüz yüklenmedi.');
      const sourceId = $('reviewNoteSource').value;
      if (!sourceId) throw new Error('Önce bir inceleme kaynağı seç.');
      $('reviewDossierText').value = buildDossierText(lastSnapshot,sourceId);
      message('İnceleme özeti oluşturuldu. İndirme işlemi yapılmadı.', 'success');
    }));
    $('selectReviewDossier').addEventListener('click',() => {
      const field = $('reviewDossierText');
      if (!field.value) {message('Önce inceleme özetini oluştur.', 'error');return;}
      field.focus();field.select();
      message('Metin seçildi. Uzun basarak kopyalayabilirsin.', 'success');
    });
    $('seed').addEventListener('click', () => task(async () => {
      const added = await api.seedExamples(); await refresh();
      message(added ? `${added} başlangıç kaydı eklendi. Hiçbiri doğrulanmış/aktif sayılmıyor.` : 'TYF ve TBF daha önce eklenmiş.', 'success');
    }));
    $('candidateForm').addEventListener('submit', event => {
      event.preventDefault();task(async () => {
        const form = event.currentTarget;
        const input = getFormObject(form);
        const preflight = discoveryEngine.report(input,await api.readAll(),api.canonicalUrl);
        if (!preflight.mayAddCandidate)
          throw new Error(preflight.title + ': ' + preflight.reason + ' Keşif ön kontrolü bölümünü kullan.');
        const candidate = await api.addCandidate(input);
        form.reset();await refresh();
        message(`${candidate.name} aday havuzuna eklendi.`, 'success');
      });
    });
    $('evidenceForm').addEventListener('submit', event => {
      event.preventDefault();task(async () => {
        await api.addEvidence(getFormObject(event.currentTarget));
        await refresh();message('Kanıt adayı eklendi; henüz doğrulanmadı.', 'success');
      });
    });
    $('evaluationForm').addEventListener('submit', event => {
      event.preventDefault();task(async () => {
        const result = await api.addEvaluation(getFormObject(event.currentTarget));
        await refresh();message(`${result.qualityScore}/100 taslak puan kaydedildi. Kaynak kabul edilmedi.`, 'success');
      });
    });
    document.addEventListener('click', event => {
      const details = event.target.closest('[data-detail-source]');
      if (details) {
        selectedSourceId = details.dataset.detailSource;
        if (lastSnapshot) {
          const types = new Map(lastSnapshot.sourceTypes.map(t => [t.typeId,t.name]));
          renderSourceDetail(lastSnapshot,types);
          $('sourceDetailPanel').scrollIntoView({block:'start',behavior:'smooth'});
        }
        return;
      }
      const candidateDecision = event.target.closest('[data-candidate-decide]');
      if (candidateDecision) {
        task(async () => {
          const id = candidateDecision.dataset.candidateDecide;
          const next = [...document.querySelectorAll('[data-candidate-next]')].find(el => el.dataset.candidateNext === id);
          const note = [...document.querySelectorAll('[data-candidate-reason]')].find(el => el.dataset.candidateReason === id);
          if (!next || !note) throw new Error('Aday inceleme alanı bulunamadı.');
          const checked = String(note.value).trim();
          if (checked.length < 15) throw new Error('En az 15 karakter inceleme gerekçesi yaz.');
          if (!confirm('Bu MANUEL ÖN İNCELEME kararını kaydetmek istiyor musun? Kimlik doğrulaması veya onay yapılmayacak.')) return;
          const updated = await api.setCandidateStatus(id,next.value,checked);
          await refresh();
          message(`${updated.name}: ${CANDIDATE_LABELS[updated.status]}. Kimlik ve haklar doğrulanmadı.`, 'success');
        });
        return;
      }
      const promote = event.target.closest('[data-promote]');
      if (promote) {
        task(async () => {
          if (!confirm('ÖN İNCELEMESİ TAMAMLANMIŞ adayı yalnızca değerlendirme durumunda KAYNAK kaydına dönüştürmek istiyor musun? Doğrulama/aktif yayın yapılmaz.')) return;
          const s = await api.promoteCandidate(promote.dataset.promote);
          await refresh();message(`${s.name} değerlendirme kaydına dönüştürüldü; kimlik ve haklar doğrulanmadı.`, 'success');
        });
        return;
      }
      const status = event.target.closest('[data-set-status][data-source-id]');
      if (status) task(async () => {
        const nextStatus = status.dataset.setStatus;
        const name = status.dataset.sourceId;
        if (!confirm(`${name} kaynağının durumunu "${niceStatus(nextStatus)}" olarak değiştirmek istiyor musun?`)) return;
        await api.setSourceStatus(name,nextStatus);await refresh();
        message(`${name}: ${niceStatus(nextStatus)}`, 'success');
      });
    });
    $('export').addEventListener('click', () => task(async () => {
      const backup = await api.exportBackup();toDownload(backup);
      message('JSON yedeği hazırlandı. İndirilenler bölümünde dosyanın bulunduğunu kontrol et.','success');
    }));
    $('backupFile').addEventListener('change',() => {backupToRestore=null;invalidateImport();});
    $('importMode').addEventListener('change',invalidateImport);
    $('previewImport').addEventListener('click', () => task(async () => {
      invalidateImport();backupToRestore=await readBackupFile();
      const mode = $('importMode').value;
      const plan = await api.previewImport(backupToRestore,mode);
      backupMode = mode;pendingPlan = plan;
      const added = Object.entries(plan.added).map(([k,v]) => `${k}: +${v}`).join(' · ');
      $('importSummary').textContent = `Kontrol başarılı. Yöntem: ${mode === 'merge' ? 'Birleştir' : 'Tam geri yükle'}. Yeni kayıtlar: ${added}. İçe alınan doğrulamalar incelemeye döner.`;
      $('importBackup').disabled = false;
      message('Yedek kontrol edildi. Henüz hiçbir kayıt değiştirilmedi.', 'success');
    }));
    $('importBackup').addEventListener('click', () => task(async () => {
      if (!pendingPlan || !backupToRestore || backupMode !== $('importMode').value) throw new Error('Önce dosyayı tekrar kontrol et.');
      if (backupMode === 'replace') {
        const ok = confirm('DİKKAT: Mevcut kaynak havuzu tamamen yedekteki kayıtlarla değiştirilecek. Önce mevcut verinin yedeğini aldın mı?');
        if (!ok) return;
      } else if (!confirm('Kontrol edilen kayıtları havuza birleştirmek istiyor musun?')) return;
      await api.importBackup(backupToRestore,backupMode);
      invalidateImport();backupToRestore=null;$('backupFile').value='';
      await refresh();message('Geri yükleme tamamlandı. İçe alınan kaynak ve kanallar yeniden doğrulama bekliyor.', 'success');
    }));
  }
  async function main() {
    try {
      if (!reviewEngine?.reportFor) throw new Error('Ön kontrol modülü yüklenemedi. sourceReviewEngine.js dosyasını kontrol et.');
      if (!discoveryEngine?.report) throw new Error('Keşif ön kontrol modülü yüklenemedi. sourceDiscoveryEngine.js dosyasını kontrol et.');
      await api.init();bind();await refresh();
      message('Yerel Kaynak Havuzu hazır. Sunucuya veya Cloudflare’a veri gönderilmiyor.', 'success');
    } catch (err) {
      console.error(err);message('Başlatma başarısız: ' + (err?.message || err), 'error');
    }
  }
  main();
})();
