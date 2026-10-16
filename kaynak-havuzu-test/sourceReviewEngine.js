/* SporNRD Kaynak Havuzu v1.2 - Salt okunur uygunluk on-kontrolu.
   Bu modül INTERNET ARAMASI, gerçek dogrulama veya otomatik kabul yapmaz.
   IndexedDB'yi acmaz, yazmaz, silmez; sadece okunan kayitlari yorumlar.
   Buradaki sekiz ON KOSUL resmi sekiz kriterli kalite puanlamasi degildir.
*/
(function (global) {
  'use strict';

  const PASS = 'passed';
  const WAIT = 'pending';
  const SECURITY_GATES = ['sport','identity','ownership','access','rights','evidence'];
  const valid = obj => obj && typeof obj === 'object';

  function reportFor(data, sourceId) {
    if (!valid(data) || !Array.isArray(data.sources) || !Array.isArray(data.channels) ||
        !Array.isArray(data.evidence) || !Array.isArray(data.evaluations) ||
        !Array.isArray(data.sourceTypes)) {
      throw new Error('Kaynak on kontrolu icin veri eksik.');
    }
    const source = data.sources.find(s => s.sourceId === sourceId);
    if (!source) throw new Error('Incelenecek kaynak bulunamadi.');

    const channels = data.channels.filter(c => c.ownerSourceId === sourceId);
    const evidence = data.evidence.filter(e => e.sourceId === sourceId);
    const evaluations = data.evaluations.filter(e => e.sourceId === sourceId);
    const verifiedEvidence = kind => evidence.some(e =>
      e.claimType === kind && e.result === 'verified' &&
      ['A','B'].includes(e.evidenceLevel) && e.checkedAt &&
      e.verificationMethod && !['manual_pending','restore_pending'].includes(e.verificationMethod)
    );
    const hasProof = evidence.some(e =>
      e.result === 'verified' && ['A','B'].includes(e.evidenceLevel) && e.checkedAt &&
      e.verificationMethod && !['manual_pending','restore_pending'].includes(e.verificationMethod)
    );
    const recentEvaluations = evaluations.filter(e =>
      e.mode === 'scored_8criteria' && e.decision === 'approved' &&
      Number.isInteger(e.qualityScore) && e.qualityScore >= 85
    );
    const approvedScore = recentEvaluations.sort((a,b) =>
      String(b.evaluatedAt || '').localeCompare(String(a.evaluatedAt || '')))[0];

    const checks = [
      {
        id:'type', label:'Kaynak türü',
        passed:data.sourceTypes.some(t => t.typeId === source.primaryTypeId && t.status === 'active'),
        explanation:'Kaynak türü aktif sözlükte yer almalı.'
      },
      {
        id:'sport', label:'Sporla ilgisi',
        passed:source.sportsRelevanceStatus === 'verified',
        explanation:'Spor ilgisi bağımsız incelemeyle doğrulanmalı; spor etiketi tek başına yetmez.'
      },
      {
        id:'identity', label:'Kuruluş kimliği',
        passed:source.identityStatus === 'verified' && verifiedEvidence('identity') && source.needsReverification === false,
        explanation:'Kimlik durumu ve A/B seviyesinde doğrulanmış kimlik kanıtı gerekli.'
      },
      {
        id:'ownership', label:'Kanal sahipliği',
        passed:channels.some(c => c.ownershipStatus === 'verified') && verifiedEvidence('ownership'),
        explanation:'En az bir yayın kanalının sahipliği ve buna ait kanıt doğrulanmalı.'
      },
      {
        id:'access', label:'İzinli/güvenli erişim',
        passed:channels.some(c => c.accessStatus === 'allowed'),
        explanation:'En az bir kanalın güvenli ve izinli erişimi ayrıca teyit edilmeli.'
      },
      {
        id:'rights', label:'İçerik kullanım hakkı',
        passed:channels.some(c => ['licensed','explicit_permission'].includes(c.usageRights)) && verifiedEvidence('usage_rights'),
        explanation:'İçerik kullanım hakkı acikca belgelenmeli; herkese acik site olmak izin sayilmaz.'
      },
      {
        id:'evidence', label:'Kanıta dayalı inceleme',
        passed:hasProof,
        explanation:'Bekleyen kanıt veya yalnızca A/B/C etiketi doğrulama sayılmaz.'
      },
      {
        id:'quality', label:'Onaylı kalite değerlendirmesi',
        passed:Boolean(approvedScore),
        explanation:'En az 85/100 puanlı, resmi sekiz kriterli onaylı değerlendirme gerekir. Manuel taslak puan sayılmaz.'
      }
    ].map(c => ({...c, status:c.passed ? PASS : WAIT}));

    const passed = checks.filter(c => c.passed).length;
    const archiveBlocked = ['archived','suspended'].includes(source.sourceStatus);
    // Gecici rapor: bile tum kosullar gecilse bile kabul/aktif olma islemi yapilmaz.
    const eligibleForHumanReview = !archiveBlocked && checks.every(c => c.passed);
    return Object.freeze({
      sourceId, sourceName:source.name, checks, passed, total:checks.length,
      pending:checks.length - passed, archiveBlocked,
      draftScore:Number.isInteger(source.qualityScore) ? source.qualityScore : null,
      securityGatesPassing:checks.filter(c => SECURITY_GATES.includes(c.id) && c.passed).length,
      eligibleForHumanReview,
      conclusion:archiveBlocked
        ? 'Kaynak arşivde veya askıda. Öncelikle yeniden inceleme gerekir.'
        : eligibleForHumanReview
          ? 'Ön koşullar sağlanıyor görünüyor. Yine de yetkili insan kararı gerekir; otomatik kabul yok.'
          : 'Ön koşullar tamamlanmadı. Kaynak yayın için otomatik kabul edilemez.'
    });
  }

  global.SPORNRD_REVIEW_ENGINE = Object.freeze({reportFor});
})(window);
