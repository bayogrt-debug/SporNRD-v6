/* SporNRD v1.4 · İnternet erişimi OLMAYAN yerel keşif ön kontrol motoru.
   Yalnızca girilen URL ve IndexedDB'nin okunmuş anlık görüntüsünü inceler.
   Bir web sitesinin resmîliğini, sahipliğini veya güvenli olduğunu kanıtlamaz.
*/
(function (global) {
  'use strict';
  const SOCIAL_HOSTS = ['instagram.com','facebook.com','x.com','twitter.com',
    'youtube.com','youtu.be','tiktok.com','threads.net','linkedin.com'];
  const labels = Object.freeze({
    website:'Web sitesi (tahmin)', rss:'RSS/Atom (tahmin)',
    api:'API (tahmin)', social:'Sosyal ağ (tahmin)'
  });
  const txt = v => String(v == null ? '' : v).replace(/\s+/g,' ').trim();
  const cleanHost = host => String(host || '').toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  const hostOf = value => {
    try { return cleanHost(new URL(value).hostname); } catch { return ''; }
  };
  const isHost = (host, domain) => host === domain || host.endsWith('.' + domain);
  const normalizeName = value => txt(value).toLocaleLowerCase('tr-TR')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9ğüşöçı\s]/gi,' ').replace(/\s+/g,' ').trim();
  function classify(url) {
    const host = cleanHost(url.hostname);
    const path = url.pathname.toLowerCase();
    if (SOCIAL_HOSTS.some(d => isHost(host,d))) return 'social';
    if (/(?:^|\/)(?:rss(?:\.(?:xml|rss))?|feed(?:\.(?:xml|rss|atom))?|atom(?:\.xml)?)(?:\/|$)/i.test(path) ||
        /\.(?:rss|atom|xml)$/i.test(path) || /^(rss|atom)$/i.test(url.searchParams.get('format') || ''))
      return 'rss';
    if (host.startsWith('api.') || /(?:^|\/)api(?:\/|$)/i.test(path) || /\.(?:json)$/i.test(path) ||
        /^json$/i.test(url.searchParams.get('format') || '')) return 'api';
    return 'website';
  }
  function riskFlags(url) {
    const host = url.hostname.toLowerCase().replace(/\[|\]/g,'');
    const out = [];
    if (url.protocol !== 'https:') out.push('HTTPS kullanılmıyor; bağlantı güvenliği doğrulanamaz.');
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
        host.endsWith('.internal') || host.endsWith('.invalid') || host.endsWith('.test') ||
        host.endsWith('.example') || host.endsWith('.onion'))
      out.push('Yerel, iç ağ veya özel amaçlı alan adı; manuel inceleme gerekli.');
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':'))
      out.push('IP adresi kullanılıyor; bağımsız kuruluş sahipliği belirsiz.');
    if (/^xn--/.test(host) || /\.xn--/.test(host))
      out.push('Uluslararası alan adı (punycode); taklit ihtimaline karşı kontrol gerekli.');
    // Bu uyarılar yalnızca ön kontroldür. DNS, TLS, telif ve robots.txt kontrolü yapılmaz.
    return out;
  }
  function report(input, data, canonicalUrl) {
    const name = txt(input?.name);
    const typeId = txt(input?.typeId);
    if (name.length < 3 || name.length > 180) throw new Error('Keşif için kaynak adı 3–180 karakter olmalı.');
    if (!data?.sources || !data?.channels || !data?.discoveryCandidates || !data?.sourceTypes)
      throw new Error('Kaynak havuzu bilgileri yüklenemedi.');
    if (!data.sourceTypes.some(t => t.typeId === typeId && t.status === 'active'))
      throw new Error('Geçerli ve etkin bir kaynak türü seçilmeli.');
    const canonical = canonicalUrl(input?.url);
    const url = new URL(canonical);
    const channelType = classify(url);
    const flags = riskFlags(url);
    const sourceById = new Map(data.sources.map(s => [s.sourceId,s]));
    const foundChannel = data.channels.find(ch => ch.canonicalUrl === canonical);
    const foundCandidate = data.discoveryCandidates.find(c => c.canonicalUrl === canonical);
    const host = cleanHost(url.hostname);
    const nearSources = new Map();
    for (const channel of data.channels) {
      const existingHost = hostOf(channel.canonicalUrl);
      if (!existingHost) continue;
      // Exact host or a subdomain suggests a relation, but never proves ownership.
      const close = host === existingHost || host.endsWith('.' + existingHost) ||
        existingHost.endsWith('.' + host);
      if (close && sourceById.has(channel.ownerSourceId))
        nearSources.set(channel.ownerSourceId,sourceById.get(channel.ownerSourceId));
    }
    const nearCandidates = data.discoveryCandidates.filter(c => {
      const ch = hostOf(c.canonicalUrl);
      return ch && (ch === host || ch.endsWith('.' + host) || host.endsWith('.' + ch));
    });
    const sameName = data.sources.filter(s => normalizeName(s.name) === normalizeName(name));
    const matchedSourceNames = [...new Map([...nearSources.values(),...sameName]
      .map(s => [s.sourceId,s])).values()].map(s => ({sourceId:s.sourceId,name:s.name}));
    let decision, title, reason;
    if (foundChannel) {
      decision = 'duplicate'; title = 'Adres zaten kayıtlı';
      reason = 'Bu tam adres mevcut bir yayın kanalının kaydında bulunuyor. Yeni kayıt açılmamalı.';
      const owner = sourceById.get(foundChannel.ownerSourceId);
      if (owner && !matchedSourceNames.some(s => s.sourceId === owner.sourceId))
        matchedSourceNames.unshift({sourceId:owner.sourceId,name:owner.name});
    } else if (foundCandidate) {
      decision = 'duplicate'; title = 'Adres zaten aday havuzunda';
      reason = 'Bu tam adres için keşif adayı zaten kayıtlı. İkinci aday oluşturulmamalı.';
    } else if (flags.length) {
      decision = 'manual_review'; title = 'Elle güvenlik incelemesi gerekli';
      reason = 'Bağlantı ve alan adı için otomatik yeni aday eklemek uygun değil.';
    } else if (nearSources.size) {
      decision = 'possible_channel'; title = 'Mevcut kaynağın yeni kanalı olabilir';
      reason = 'Benzer alan adında kayıtlı bir kaynak var. Bu, ortak sahiplik veya yetki kanıtı değildir. Yeni kanal otomatik eklenmez.';
    } else if (nearCandidates.length) {
      decision = 'manual_review'; title = 'Mevcut adayla ilişki incelenmeli';
      reason = 'Aynı veya ilişkili alan adında bekleyen aday var. Mükerrer kuruluş açmadan önce inceleme gerekir.';
    } else if (sameName.length) {
      decision = 'manual_review'; title = 'Aynı isimli kuruluş kaydı var';
      reason = 'Aynı isimde kaynak zaten mevcut, ancak adresi farklı. Taklit veya ayrı kanal olabilir; otomatik birleştirme yapılmaz.';
    } else if (channelType !== 'website') {
      decision = 'manual_review'; title = 'Önce yayıncı kuruluş tespit edilmeli';
      reason = 'RSS, API veya sosyal adresi tek başına yeni bir kuruluş kimliğini ispatlamaz.';
    } else {
      decision = 'new_source'; title = 'Yeni kaynak adayı oluşturulabilir';
      reason = 'Kesin adres mükerrerliği veya yakın alan adı eşleşmesi bulunmadı. Bu yalnızca aday kaydı iznidir; kuruluş doğrulanmış değildir.';
    }
    return Object.freeze({name, typeId, canonicalUrl:canonical, channelType,
      channelLabel:labels[channelType], decision, title, reason,
      matchedSources:matchedSourceNames, riskFlags:flags,
      mayAddCandidate:decision === 'new_source',
      verification:'SİTEYE İSTEK YAPILMADI · KİMLİK / HAKLAR DOĞRULANMADI'});
  }
  global.SPORNRD_DISCOVERY_ENGINE = Object.freeze({report, classify, riskFlags});
})(window);
