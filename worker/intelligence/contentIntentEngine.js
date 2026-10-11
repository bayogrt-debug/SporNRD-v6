/* =========================================================
   SporNRD
   worker/intelligence/contentIntentEngine.js

   İçerik Niyet / Durum Anlama Motoru

   Sürüm: 6.1.4
   Engine Version: 1.3

   AMAÇ
   ---------------------------------------------------------
   Bir içeriği kategoriye atmadan ÖNCE şunu anlamak:

   - Bu içerik aslında ne anlatıyor?
   - Sonuç / başarı haberi mi?
   - Görevlendirme / transfer haberi mi?
   - Kayıt / başvuru var mı?
   - Yaklaşan gerçek bir fırsat / etkinlik mi?
   - Kampanya mı?
   - İş ilanı mı?
   - Ürün / mağaza içeriği mi?
   - Yalnızca duyuru / genel haber mi?
   - Kullanıcı gerçekten işlem yapabilir mi?

   ANA KATEGORİLERLE UYUMLU
   ---------------------------------------------------------
   news
   course
   event
   campaign
   jobs
   stores

   =========================================================
   1.3 ANA GELİŞTİRME
   ---------------------------------------------------------
   Spor haberlerindeki tamamlanmış olay ve başarı dili
   genişletildi.

   Örnek:

   "Murat Ciner, FIBA 3X3 A Klasmanına Yükseldi"
   ---------------------------------------------------------
   contentIntent:
   achievement

   eventStatus:
   completed


   "FIBA Europe Cup'ta 1. Hafta Noktalandı"
   ---------------------------------------------------------
   gerçek spor organizasyonu + tamamlanma dili:

   eventStatus:
   completed


   "Basketbol Şampiyonlar Ligi'nde
    1. Hafta Heyecanı Yaşandı"
   ---------------------------------------------------------
   organizasyon bağlamı + geçmiş/tamamlanmış faaliyet dili:

   eventStatus:
   completed


   KRİTİK:
   ---------------------------------------------------------
   "yaşandı"
   "oynandı"
   "geride kaldı"

   gibi ifadeler tek başına completed üretmez.

   Bunların yanında gerçek spor organizasyonu / müsabaka
   bağlamı bulunmalıdır.

   Böylece:

   "Yoğun bir süreç yaşandı"

   gibi genel veya idarî ifadeler yanlışlıkla spor sonucu
   sayılmaz.

   =========================================================
   1.2 KURALI KORUNUYOR
   ---------------------------------------------------------
   Gelecek zaman fiili tek başına upcoming üretmez.

   "Antrenör vize işlemleri 1 Ekim'de başlayacak."
   ---------------------------------------------------------
   contentIntent:
   announcement

   eventStatus:
   unknown

   Çünkü başlayan şey spor etkinliği değil,
   idarî / meslekî işlem dönemidir.

   =========================================================
   TEMEL KURAL
   ---------------------------------------------------------
   Önce ANLA
   sonra SINIFLANDIR
   sonra ZAMANI ÇÖZ
   sonra SEÇ
   sonra YAZ.

   Bu motor:
   - Kaynakta olmayan bilgi üretmez.
   - Yayın tarihini olay tarihi saymaz.
   - Temporal Engine'in görevini üstlenmez.
   - İşlem başlangıcını etkinlik başlangıcı saymaz.
   - Genel geçmiş zaman fiilini tek başına spor sonucu saymaz.
   - Emin olmadığı durumda güvenli varsayım olarak
     news / unknown kullanır.
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const CONTENT_INTENT_VERSION =
  "1.3";


/* =========================================================
   CONTENT INTENT TÜRLERİ
   ========================================================= */

export const CONTENT_INTENTS = {

  opportunity:
    "opportunity",

  registration:
    "registration",

  result:
    "result",

  achievement:
    "achievement",

  assignment:
    "assignment",

  transfer:
    "transfer",

  announcement:
    "announcement",

  campaign:
    "campaign",

  job:
    "job",

  product:
    "product",

  news:
    "news"

};


/* =========================================================
   EVENT STATUS

   Bu yalnızca içerik dilinden çıkan ilk semantik karardır.

   Nihai tarih karşılaştırmasını Temporal Engine yapar.
   ========================================================= */

export const EVENT_STATUSES = {

  upcoming:
    "upcoming",

  ongoing:
    "ongoing",

  completed:
    "completed",

  unknown:
    "unknown"

};


/* =========================================================
   GERÇEK ETKİNLİK / SPOR ORGANİZASYONU NESNELERİ
   ========================================================= */

const EVENT_OBJECT_SIGNALS = [

  "sampiyona",

  "turnuva",

  "musabaka",

  "karsilasma",

  "mac",

  "yarisma",

  "spor yarismasi",

  "final",

  "final four",

  "kupa",

  "festival",

  "spor senligi",

  "etkinlik",

  "organizasyon",

  "spor organizasyonu",

  "kamp",

  "spor kampi",

  "hazirlik kampi",

  "yaz kampi",

  "seminer",

  "panel",

  "konferans",

  "workshop",

  "atolye",

  "kurs",

  "antrenorluk kursu",

  "antrenor kursu",

  "hakemlik kursu",

  "hakem kursu",

  "egitim programi",

  "egitim etkinligi",

  "sertifika programi",


  /* -------------------------------------------------------
     LİG / ULUSLARARASI ORGANİZASYONLAR
     ------------------------------------------------------- */

  "sampiyonlar ligi",

  "basketbol ligi",

  "super ligi",

  "euroleague",

  "eurocup",

  "europe cup",

  "fiba europe cup",

  "basketball champions league",

  "champions league"

];


/* =========================================================
   İDARİ / İŞLEMSEL SÜREÇLER
   ========================================================= */

const ADMINISTRATIVE_PROCESS_SIGNALS = [

  "vize islemleri",

  "vize islemi",

  "lisans islemleri",

  "lisans islemi",

  "tescil islemleri",

  "tescil islemi",

  "kayit islemleri",

  "kayit islemi",

  "basvuru islemleri",

  "basvuru islemi",

  "odeme islemleri",

  "odeme islemi",

  "banka odeme",

  "belge islemleri",

  "belge islemi",

  "evrak islemleri",

  "evrak islemi",

  "delege islemleri",

  "delegelerin ulasim",

  "delegelerinin ulasim",

  "delege ulasim",

  "ulasim islemleri",

  "konaklama islemleri",

  "transfer islemleri",

  "genel kurul",

  "mali genel kurul",

  "olagan genel kurul",

  "olaganustu genel kurul",

  "yonetim kurulu",

  "disiplin kurulu",

  "tahkim kurulu",

  "denetim kurulu",

  "ihale",

  "satin alma",

  "teklif verme",

  "teklif mektubu",

  "hizmet alimi",

  "mal alimi",

  "sistem islemleri",

  "hesap islemleri",

  "portal islemleri"

];


/* =========================================================
   GELECEK ZAMAN SİNYALLERİ
   ========================================================= */

const FUTURE_LANGUAGE_SIGNALS = [

  "duzenlenecek",

  "duzenlenecektir",

  "gerceklesecek",

  "gerceklesecektir",

  "gerceklestirilecek",

  "gerceklestirilecektir",

  "yapilacak",

  "yapilacaktir",

  "oynanacak",

  "oynanacaktir",

  "baslayacak",

  "baslayacaktir",

  "basliyor",

  "katilim saglanacak",

  "gerceklesmesi planlaniyor"

];


/* =========================================================
   DEVAM EDEN FAALİYET SİNYALLERİ
   ========================================================= */

const ONGOING_LANGUAGE_SIGNALS = [

  "devam ediyor",

  "suruyor",

  "devam etmekte",

  "halen devam eden",

  "bugun devam ediyor",

  "musabakalar devam ediyor",

  "turnuva devam ediyor",

  "sampiyona devam ediyor",

  "kamp devam ediyor",

  "lig devam ediyor"

];


/* =========================================================
   GÜÇLÜ TAMAMLANMIŞ OLAY SİNYALLERİ

   Bunlar kendi başına tamamlanmışlık anlamı taşır.

   Yine de completedEvent olması için gerçek etkinlik
   bağlamı ayrıca kontrol edilir.
   ========================================================= */

const COMPLETED_LANGUAGE_SIGNALS = [

  "tamamlandi",

  "sona erdi",

  "duzenlendi",

  "gerceklestirildi",

  "sampiyon oldu",

  "kupayi kazandi",

  "kupayi kaldirdi",

  "maglup etti",

  "galip geldi",

  "sonuclandi",

  "noktalanmis oldu",

  "noktalandı",

  "noktalanarak sona erdi",

  "bitti"

];


/* =========================================================
   BAĞLAMA BAĞLI TAMAMLANMIŞLIK SİNYALLERİ

   Bunlar tek başına kullanılmaz.

   Gerçek spor etkinliği / organizasyonu bulunmalıdır.

   Örnek:

   "1. Hafta Heyecanı Yaşandı"
   + Şampiyonlar Ligi
   → completed

   "Yoğun bir süreç yaşandı"
   → completed DEĞİL
   ========================================================= */

const CONTEXTUAL_COMPLETED_SIGNALS = [

  "hafta heyecani yasandi",

  "heyecani yasandi",

  "karsilasmalar oynandi",

  "karsilasma oynandi",

  "maclar oynandi",

  "mac oynandi",

  "musabakalar oynandi",

  "musabaka oynandi",

  "hafta geride kaldi",

  "ilk hafta geride kaldi",

  "birinci hafta geride kaldi",

  "etap geride kaldi",

  "tur geride kaldi"

];


/* =========================================================
   BAŞARI / KARİYER GELİŞİMİ SİNYALLERİ
   ========================================================= */

const ACHIEVEMENT_SIGNALS = [

  "rekor kirdi",

  "turkiye rekoru",

  "dunya rekoru",

  "madalya kazandi",

  "altin madalya",

  "gumus madalya",

  "bronz madalya",

  "derece elde etti",

  "basari elde etti",

  "kota kazandi",

  "rekor yeniledi",

  "klasmana yukseldi",

  "klasmanina yukseldi",

  "bir ust klasmana yukseldi",

  "a klasmanina yukseldi",

  "b klasmanina yukseldi",

  "ust klasmana yukseldi",

  "terfi etti"

];


/* =========================================================
   ANA ANALİZ
   ========================================================= */

export function analyzeContentIntent(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackResult();

  }


  const text =
    buildSearchText(
      post
    );


  const titleText =
    buildTitleText(
      post
    );


  /* =======================================================
     SEMANTİK BAĞLAM
     ========================================================= */

  const semanticContext =
    analyzeSemanticContext({

      post:
        post,

      text:
        text,

      titleText:
        titleText

    });


  const scores =
    createScoreMap();


  const reasons =
    [];


  /* =======================================================
     1. İŞ İLANI
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "job",

    patterns: [

      ["is ilani", 12],
      ["personel araniyor", 14],
      ["antrenor araniyor", 14],
      ["egitmen araniyor", 14],
      ["calisma arkadasi ariyoruz", 12],
      ["ekibimize katil", 8],
      ["cv gonder", 12],
      ["ozgecmis gonder", 12],
      ["ise alim", 11],
      ["acik pozisyon", 10],
      ["pozisyon icin", 6],
      ["tam zamanli", 6],
      ["yari zamanli", 6],
      ["part time", 6],
      ["full time", 6]

    ],

    reasons:
      reasons,

    reasonLabel:
      "İş ilanı sinyali"

  });


  /* =======================================================
     2. ÜRÜN / MAĞAZA
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "product",

    patterns: [

      ["sepete ekle", 14],
      ["satin al", 11],
      ["stokta", 10],
      ["stok durumu", 9],
      ["urun fiyati", 10],
      ["liste fiyati", 7],
      ["kargo", 5],
      ["beden sec", 6],
      ["numara sec", 6],
      ["urun", 2]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Ürün / mağaza sinyali"

  });


  /* =======================================================
     3. KAMPANYA
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "campaign",

    patterns: [

      ["kampanya", 13],
      ["indirim", 10],
      ["ozel fiyat", 9],
      ["erken kayit indirimi", 14],
      ["uyelik indirimi", 13],
      ["ilk ay ucretsiz", 14],
      ["ilk ders ucretsiz", 12],
      ["deneme dersi ucretsiz", 12],
      ["promosyon", 9],
      ["kupon kodu", 10],
      ["indirim kodu", 10],
      ["yuzde indirim", 9]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Kampanya sinyali"

  });


  /* =======================================================
     4. SONUÇ
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "result",

    patterns: [

      ["sampiyon oldu", 16],
      ["sampiyonlugunu ilan etti", 16],
      ["sampiyonluga ulasti", 16],
      ["kupayi kazandi", 16],
      ["kupayi kaldirdi", 15],
      ["macini kazandi", 12],
      ["karsilasmayi kazandi", 12],
      ["maglup etti", 12],
      ["galip geldi", 12],
      ["sonuclandi", 13],
      ["tamamlandi", 11],
      ["sona erdi", 11],
      ["final sona erdi", 12],
      ["sonuc belli oldu", 12],

      /* ---------------------------------------------------
         1.3
         --------------------------------------------------- */

      ["noktalandı", 14],
      ["hafta noktalandı", 15]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Sonuç sinyali"

  });


  /* =======================================================
     5. BAŞARI
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "achievement",

    patterns: [

      ["rekor kirdi", 15],
      ["turkiye rekoru", 12],
      ["dunya rekoru", 14],
      ["madalya kazandi", 14],
      ["altin madalya", 12],
      ["gumus madalya", 11],
      ["bronz madalya", 11],
      ["derece elde etti", 11],
      ["basari elde etti", 9],
      ["kota kazandi", 11],
      ["rekor yeniledi", 13],

      /* ---------------------------------------------------
         KLASMAN / YÜKSELME
         --------------------------------------------------- */

      ["klasmana yukseldi", 16],
      ["klasmanina yukseldi", 16],
      ["bir ust klasmana yukseldi", 18],
      ["a klasmanina yukseldi", 18],
      ["b klasmanina yukseldi", 17],
      ["ust klasmana yukseldi", 17],
      ["terfi etti", 10]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Başarı sinyali"

  });


  /* =======================================================
     6. GÖREVLENDİRME
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "assignment",

    patterns: [

      ["gorevlendirildi", 14],
      ["goreve getirildi", 14],
      ["gorevini aldi", 12],
      ["gorev aldi", 11],
      ["hakemlik gorevi", 12],
      ["hakem olarak gorevlendirildi", 16],
      ["antrenor olarak gorevlendirildi", 15],
      ["teknik direktor olarak", 9],
      ["atandi", 12],
      ["atamasi yapildi", 12]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Görevlendirme sinyali"

  });


  /* =======================================================
     7. TRANSFER / KARİYER HAREKETİ
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "transfer",

    patterns: [

      ["transfer oldu", 14],
      ["transfer edildi", 14],
      ["kadroya katildi", 13],
      ["takima katildi", 12],
      ["sozlesme imzaladi", 14],
      ["sozlesme yeniledi", 12],
      ["yeni kulubu", 10],
      ["ayrilik aciklamasi", 9],
      ["yollar ayrildi", 11]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Transfer / kariyer sinyali"

  });


  /* =======================================================
     8. KAYIT / BAŞVURU
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "registration",

    patterns: [

      ["basvurular basladi", 15],
      ["kayitlar basladi", 15],
      ["kayit yaptir", 13],
      ["basvuru yap", 13],
      ["basvuru formu", 11],
      ["kayit formu", 11],
      ["kayit islemleri", 10],
      ["son basvuru", 13],
      ["son kayit", 13],
      ["basvuru tarihi", 9],
      ["kayit tarihi", 9],
      ["e devlet uzerinden", 6],
      ["e devlet", 4],
      ["is gunu icinde", 7],
      ["tamamlamalari gerekmektedir", 10],
      ["kayit yaptirmalari", 10],
      ["gerekli belgeler", 6],
      ["basvuru kosullari", 8],
      ["kayit kosullari", 8]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Kayıt / başvuru sinyali"

  });


  /* =======================================================
     9. FIRSAT / GERÇEK FAALİYET
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "opportunity",

    patterns: [

      ["katilabilir", 9],
      ["katilim icin", 8],
      ["katilim", 4],
      ["turnuva", 3],
      ["festival", 4],
      ["spor senligi", 4],
      ["kamp", 3],
      ["seminer", 3],
      ["kurs", 3],
      ["sampiyona", 3],
      ["musabaka", 2]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Fırsat / faaliyet sinyali"

  });


  /* =======================================================
     10. DUYURU
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "announcement",

    patterns: [

      ["duyuru", 8],
      ["duyuruldu", 7],
      ["duyurusu", 7],
      ["aciklandi", 6],
      ["bilgilendirme", 8],
      ["ilan edildi", 7],
      ["yayimlandi", 5],
      ["programi aciklandi", 9],
      ["liste aciklandi", 8],
      ["takvim aciklandi", 8]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Duyuru sinyali"

  });


  /* =======================================================
     11. GENEL HABER
     ========================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "news",

    patterns: [

      ["ziyaret etti", 6],
      ["bir araya geldi", 6],
      ["toplanti", 5],
      ["aciklama yapti", 6],
      ["protokol", 5],
      ["roportaj", 5],
      ["degerlendirmelerde bulundu", 5],
      ["federasyonu", 1],
      ["kulubu", 1]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Genel haber sinyali"

  });


  /* =======================================================
     12. STRUCTURED DATA / ACTION DESTEĞİ
     ========================================================= */

  applyStructuredSignals({

    post:
      post,

    scores:
      scores,

    reasons:
      reasons

  });


  /* =======================================================
     13. SEMANTİK BAĞLAM KURALLARI
     ========================================================= */

  applySemanticContextRules({

    semanticContext:
      semanticContext,

    scores:
      scores,

    reasons:
      reasons

  });


  /* =======================================================
     14. ÖZEL ÇAKIŞMA KURALLARI
     ========================================================= */

  applySpecialRules({

    post:
      post,

    text:
      text,

    titleText:
      titleText,

    scores:
      scores,

    reasons:
      reasons,

    semanticContext:
      semanticContext

  });


  /* =======================================================
     15. NİHAİ INTENT
     ========================================================= */

  const contentIntent =
    selectIntent(
      scores
    );


  /* =======================================================
     16. SEMANTİK EVENT STATUS
     ========================================================= */

  const eventStatus =
    determineEventStatus({

      text:
        text,

      contentIntent:
        contentIntent,

      reasons:
        reasons,

      semanticContext:
        semanticContext

    });


  /* =======================================================
     17. ACTIONABLE
     ========================================================= */

  const actionable =
    determineActionable({

      post:
        post,

      text:
        text,

      contentIntent:
        contentIntent,

      eventStatus:
        eventStatus

    });


  /* =======================================================
     18. OPPORTUNITY SCORE
     ========================================================= */

  const opportunityScore =
    calculateOpportunityScore({

      contentIntent:
        contentIntent,

      eventStatus:
        eventStatus,

      actionable:
        actionable,

      scores:
        scores

    });


  /* =======================================================
     19. CONFIDENCE
     ========================================================= */

  const confidenceScore =
    calculateConfidenceScore(
      scores,
      contentIntent
    );


  /* =======================================================
     20. FEED TREATMENT
     ========================================================= */

  const feedTreatment =
    determineFeedTreatment({

      contentIntent:
        contentIntent,

      actionable:
        actionable,

      opportunityScore:
        opportunityScore

    });


  return {

    version:
      CONTENT_INTENT_VERSION,

    contentIntent:
      contentIntent,

    eventStatus:
      eventStatus,

    actionable:
      actionable,

    opportunityScore:
      opportunityScore,

    confidenceScore:
      confidenceScore,

    feedTreatment:
      feedTreatment,


    /* -----------------------------------------------------
       Debug / semantik karar özeti
       ----------------------------------------------------- */

    context: {

      eventObject:
        semanticContext.eventObject,

      eventObjectInTitle:
        semanticContext.eventObjectInTitle,

      administrativeProcess:
        semanticContext.administrativeProcess,

      pureAdministrativeProcess:
        semanticContext.pureAdministrativeProcess,

      futureLanguage:
        semanticContext.futureLanguage,

      futureEvent:
        semanticContext.futureEvent,

      futureAdministrativeProcess:
        semanticContext.futureAdministrativeProcess,

      ongoingEvent:
        semanticContext.ongoingEvent,

      completedLanguage:
        semanticContext.completedLanguage,

      contextualCompletedLanguage:
        semanticContext.contextualCompletedLanguage,

      completedEvent:
        semanticContext.completedEvent,

      achievementLanguage:
        semanticContext.achievementLanguage

    },


    scores:
      roundScores(
        scores
      ),

    reasons:
      [
        ...new Set(
          reasons
        )
      ],

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   POSTA UYGULA
   ========================================================= */

export function applyContentIntent(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const analysis =
    analyzeContentIntent(
      post
    );


  return {

    ...post,

    contentIntent:
      analysis.contentIntent,

    eventStatus:
      analysis.eventStatus,

    actionable:
      analysis.actionable,

    opportunityScore:
      analysis.opportunityScore,

    intentMeta: {

      version:
        analysis.version,

      confidenceScore:
        analysis.confidenceScore,

      feedTreatment:
        analysis.feedTreatment,

      context:
        analysis.context,

      scores:
        analysis.scores,

      reasons:
        analysis.reasons,

      analyzedAt:
        analysis.analyzedAt

    }

  };

}


/* =========================================================
   LİSTEYE UYGULA
   ========================================================= */

export function applyContentIntentToPosts(
  posts
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  return posts

    .map(
      applyContentIntent
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   SCORE MAP
   ========================================================= */

function createScoreMap() {

  return {

    opportunity:
      0,

    registration:
      0,

    result:
      0,

    achievement:
      0,

    assignment:
      0,

    transfer:
      0,

    announcement:
      0,

    campaign:
      0,

    job:
      0,

    product:
      0,

    news:
      0

  };

}


/* =========================================================
   SEMANTİK BAĞLAM ANALİZİ
   ========================================================= */

function analyzeSemanticContext({

  post,
  text,
  titleText

}) {

  void post;


  const eventObject =
    containsAnyFragment(
      text,
      EVENT_OBJECT_SIGNALS
    );


  const eventObjectInTitle =
    containsAnyFragment(
      titleText,
      EVENT_OBJECT_SIGNALS
    );


  const administrativeProcess =
    containsAnyFragment(
      text,
      ADMINISTRATIVE_PROCESS_SIGNALS
    );


  const administrativeProcessInTitle =
    containsAnyFragment(
      titleText,
      ADMINISTRATIVE_PROCESS_SIGNALS
    );


  const futureLanguage =
    containsAnyFragment(
      text,
      FUTURE_LANGUAGE_SIGNALS
    );


  const ongoingLanguage =
    containsAnyFragment(
      text,
      ONGOING_LANGUAGE_SIGNALS
    );


  const strongCompletedLanguage =
    containsAnyFragment(
      text,
      COMPLETED_LANGUAGE_SIGNALS
    );


  /*
    "yaşandı", "oynandı", "geride kaldı"

    gibi ifadeler yalnız gerçek spor organizasyonu varsa
    tamamlanmışlık sinyali kabul edilir.
  */

  const contextualCompletedLanguage =
    Boolean(

      eventObject

      &&

      containsAnyFragment(
        text,
        CONTEXTUAL_COMPLETED_SIGNALS
      )

    );


  const completedLanguage =
    Boolean(

      strongCompletedLanguage

      ||

      contextualCompletedLanguage

    );


  const achievementLanguage =
    containsAnyFragment(
      text,
      ACHIEVEMENT_SIGNALS
    );


  /* -------------------------------------------------------
     GÜÇLÜ GERÇEK ETKİNLİK BAĞLAMI
     ------------------------------------------------------- */

  const strongEventContext =
    eventObjectInTitle
    ||
    (
      eventObject

      &&

      !administrativeProcessInTitle
    );


  /* -------------------------------------------------------
     SAF İDARİ SÜREÇ
     ------------------------------------------------------- */

  const pureAdministrativeProcess =
    Boolean(

      administrativeProcess

      &&

      !eventObjectInTitle

      &&

      (
        administrativeProcessInTitle

        ||

        !eventObject
      )

    );


  const futureAdministrativeProcess =
    Boolean(

      futureLanguage

      &&

      pureAdministrativeProcess

    );


  const futureEvent =
    Boolean(

      futureLanguage

      &&

      strongEventContext

      &&

      !pureAdministrativeProcess

    );


  const ongoingEvent =
    Boolean(

      ongoingLanguage

      &&

      strongEventContext

      &&

      !pureAdministrativeProcess

    );


  const completedEvent =
    Boolean(

      completedLanguage

      &&

      strongEventContext

      &&

      !pureAdministrativeProcess

    );


  return {

    eventObject:
      eventObject,

    eventObjectInTitle:
      eventObjectInTitle,

    administrativeProcess:
      administrativeProcess,

    administrativeProcessInTitle:
      administrativeProcessInTitle,

    pureAdministrativeProcess:
      pureAdministrativeProcess,

    strongEventContext:
      strongEventContext,

    futureLanguage:
      futureLanguage,

    ongoingLanguage:
      ongoingLanguage,

    strongCompletedLanguage:
      strongCompletedLanguage,

    contextualCompletedLanguage:
      contextualCompletedLanguage,

    completedLanguage:
      completedLanguage,

    achievementLanguage:
      achievementLanguage,

    futureAdministrativeProcess:
      futureAdministrativeProcess,

    futureEvent:
      futureEvent,

    ongoingEvent:
      ongoingEvent,

    completedEvent:
      completedEvent

  };

}


/* =========================================================
   SEMANTİK BAĞLAM → SCORE KURALLARI
   ========================================================= */

function applySemanticContextRules({

  semanticContext,
  scores,
  reasons

}) {

  /* -------------------------------------------------------
     GERÇEK GELECEK ETKİNLİK
     ------------------------------------------------------- */

  if (
    semanticContext.futureEvent
  ) {

    scores.opportunity +=
      12;


    scores.result -=
      5;


    scores.achievement -=
      3;


    reasons.push(
      "Gelecek zaman dili gerçek faaliyet/etkinlik bağlamıyla birlikte bulundu."
    );

  }


  /* -------------------------------------------------------
     İDARİ SÜREÇ + GELECEK ZAMAN
     ------------------------------------------------------- */

  if (
    semanticContext.futureAdministrativeProcess
  ) {

    scores.announcement +=
      8;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        12

      );


    reasons.push(
      "Gelecek zaman ifadesi gerçek etkinlik yerine idarî/işlemsel süreci anlatıyor."
    );

  }


  /* -------------------------------------------------------
     İDARİ BAĞLAM
     ------------------------------------------------------- */

  if (
    semanticContext.pureAdministrativeProcess
  ) {

    scores.announcement +=
      4;

  }


  /* -------------------------------------------------------
     TAMAMLANMIŞ GERÇEK SPOR OLAYI

     Özellikle:

     - hafta noktalandı
     - hafta heyecanı yaşandı
     - karşılaşmalar oynandı
     - hafta geride kaldı

     gibi başlıkları güçlendirir.
     ------------------------------------------------------- */

  if (
    semanticContext.completedEvent
  ) {

    scores.result +=
      8;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        8

      );


    reasons.push(
      "Gerçek spor faaliyeti tamamlanmış/geçmiş olay diliyle birlikte bulundu."
    );

  }


  /* -------------------------------------------------------
     BAŞARI DİLİ
     ------------------------------------------------------- */

  if (
    semanticContext.achievementLanguage
  ) {

    scores.achievement +=
      6;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        4

      );


    reasons.push(
      "Sporcu/hakem kariyer başarısı veya klasman yükselişi sinyali bulundu."
    );

  }

}


/* =========================================================
   STRUCTURED SIGNALS
   ========================================================= */

function applyStructuredSignals({

  post,
  scores,
  reasons

}) {

  const details =
    isPlainObject(
      post?.details
    )
      ? post.details
      : {};


  const facts =
    isPlainObject(
      post?.facts
    )
      ? post.facts
      : {};


  const category =
    normalizeId(
      post?.category
    );


  const providerType =
    normalizeId(
      post?.providerType
    );


  /* -------------------------------------------------------
     GERÇEK ACTION TİPLERİ
     ------------------------------------------------------- */

  if (
    hasActionType(
      post,
      [
        "register",
        "apply"
      ]
    )
  ) {

    scores.registration +=
      12;


    reasons.push(
      "Post üzerinde doğrudan kayıt/başvuru aksiyonu var."
    );

  }


  if (
    hasActionType(
      post,
      [
        "ticket",
        "join",
        "contact"
      ]
    )
  ) {

    scores.opportunity +=
      8;


    reasons.push(
      "Post üzerinde katılım/iletişim aksiyonu var."
    );

  }


  if (
    hasActionType(
      post,
      [
        "buy",
        "product"
      ]
    )
  ) {

    scores.product +=
      14;


    reasons.push(
      "Post üzerinde ürün/satın alma aksiyonu var."
    );

  }


  if (
    hasActionType(
      post,
      [
        "campaign"
      ]
    )
  ) {

    scores.campaign +=
      14;


    reasons.push(
      "Post üzerinde kampanya aksiyonu var."
    );

  }


  /* -------------------------------------------------------
     İŞ
     ------------------------------------------------------- */

  if (
    category ===
    "jobs"

    ||

    hasUsefulValue(
      details.position
    )

    ||

    hasUsefulValue(
      details.employmentType
    )

    ||

    hasUsefulValue(
      details.salaryMin
    )

    ||

    hasUsefulValue(
      details.salaryMax
    )
  ) {

    scores.job +=
      category ===
      "jobs"
        ? 8
        : 5;

  }


  /* -------------------------------------------------------
     ÜRÜN
     ------------------------------------------------------- */

  if (
    category ===
    "stores"

    ||

    providerType ===
    "store"

    ||

    hasUsefulValue(
      details.productName
    )

    ||

    hasUsefulValue(
      details.stockStatus
    )
  ) {

    scores.product +=
      (
        category ===
        "stores"

        ||

        providerType ===
        "store"
      )
        ? 7
        : 4;

  }


  /* -------------------------------------------------------
     KAMPANYA
     ------------------------------------------------------- */

  if (
    category ===
    "campaign"

    ||

    hasUsefulValue(
      details.discountRate
    )

    ||

    (
      hasUsefulValue(
        details.oldPrice
      )

      &&

      (
        hasUsefulValue(
          details.newPrice
        )

        ||

        hasUsefulValue(
          details.price
        )
      )
    )
  ) {

    scores.campaign +=
      category ===
      "campaign"
        ? 7
        : 5;

  }


  /* -------------------------------------------------------
     REGISTRATION
     ------------------------------------------------------- */

  if (
    hasUsefulValue(
      details.registrationDeadline
    )

    ||

    hasUsefulValue(
      details.applicationDeadline
    )

    ||

    hasUsefulValue(
      details.deadlineIso
    )

    ||

    hasUsefulValue(
      facts.registrationDeadline
    )

    ||

    hasUsefulValue(
      facts.applicationDeadline
    )
  ) {

    if (
      category !==
      "jobs"
    ) {

      scores.registration +=
        7;

    }

  }


  /* -------------------------------------------------------
     LEGACY FACT ENGINE
     ------------------------------------------------------- */

  if (
    facts.isCoachCourse ===
    true
  ) {

    scores.opportunity +=
      5;

  }


  if (
    facts.actionRequired ===
    true
  ) {

    scores.registration +=
      4;

  }

}


/* =========================================================
   ÖZEL KURALLAR
   ========================================================= */

function applySpecialRules({

  post,
  text,
  titleText,
  scores,
  reasons,
  semanticContext

}) {

  /* -------------------------------------------------------
     GÜÇLÜ SONUÇ BAŞLIĞI
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      titleText,
      [
        "sampiyon oldu",
        "kupayi kazandi",
        "kupayi kaldirdi",
        "maglup etti",
        "galip geldi",
        "noktalandı"
      ]
    )
  ) {

    scores.result +=
      10;


    reasons.push(
      "Başlık doğrudan tamamlanmış spor sonucu/faaliyeti bildiriyor."
    );

  }


  /* -------------------------------------------------------
     GÜÇLÜ BAŞARI BAŞLIĞI
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      titleText,
      [
        "rekor kirdi",
        "madalya kazandi",
        "derece elde etti",
        "kota kazandi",
        "klasmana yukseldi",
        "klasmanina yukseldi",
        "bir ust klasmana yukseldi",
        "a klasmanina yukseldi",
        "b klasmanina yukseldi",
        "terfi etti"
      ]
    )
  ) {

    scores.achievement +=
      10;


    reasons.push(
      "Başlık doğrudan başarı veya kariyer/klasman yükselişi bildiriyor."
    );

  }


  /* -------------------------------------------------------
     ŞAMPİYON ≠ ŞAMPİYONA
     ------------------------------------------------------- */

  if (
    containsPhrase(
      titleText,
      "sampiyon"
    )
  ) {

    scores.result +=
      6;

  }


  /* -------------------------------------------------------
     ŞAMPİYONLUK + TEBRİK
     ------------------------------------------------------- */

  if (
    (
      containsPhrase(
        titleText,
        "sampiyon"
      )

      ||

      containsAnyPhrase(
        titleText,
        [
          "kupayi kazandi",
          "sampiyon oldu"
        ]
      )
    )

    &&

    containsAnyPhrase(
      text,
      [
        "tebrik ederiz",
        "sampiyonluga ulasti",
        "kupayi kazandi",
        "kazandi"
      ]
    )
  ) {

    scores.result +=
      12;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        8

      );


    reasons.push(
      "Şampiyonluk/sonuç dili yaklaşan etkinlik yorumunu bastırdı."
    );

  }


  /* -------------------------------------------------------
     KLASMAN YÜKSELİŞİ

     Örnek:
     "Murat Ciner, FIBA 3X3 A Klasmanına Yükseldi"

     Bu bir genel haber değil, doğrudan başarıdır.
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      text,
      [
        "klasmana yukseldi",
        "klasmanina yukseldi",
        "bir ust klasmana yukseldi",
        "a klasmanina yukseldi",
        "b klasmanina yukseldi",
        "ust klasmana yukseldi"
      ]
    )
  ) {

    scores.achievement +=
      8;


    scores.news =
      Math.max(
        0,
        scores.news -
        2
      );


    scores.opportunity =
      Math.max(
        0,
        scores.opportunity -
        5
      );


    reasons.push(
      "Klasman yükselişi doğrudan sportif/kariyer başarısı olarak değerlendirildi."
    );

  }


  /* -------------------------------------------------------
     KAYIT HAKKI KAZANANLAR
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      text,
      [
        "kayit hakki kazanan",
        "hak kazanan sporcular",
        "hak kazanan adaylar"
      ]
    )
  ) {

    scores.result +=
      8;


    scores.announcement +=
      7;


    if (
      containsAnyPhrase(
        text,
        [
          "kayit islemlerini",
          "is gunu icinde",
          "tamamlamalari gerekmektedir",
          "kayit yaptirmalari",
          "basvuru yapmalari"
        ]
      )
    ) {

      scores.registration +=
        18;


      reasons.push(
        "Sonuç duyurusu sonrası kullanıcıdan gerçek kayıt/başvuru işlemi bekleniyor."
      );

    }

  }


  /* -------------------------------------------------------
     GERÇEK GELECEK FAALİYET
     ------------------------------------------------------- */

  if (
    semanticContext.futureEvent
  ) {

    scores.result =
      Math.max(

        -10,

        scores.result -
        2

      );


    scores.achievement =
      Math.max(

        -10,

        scores.achievement -
        2

      );

  }


  /* -------------------------------------------------------
     TAMAMLANMIŞ GERÇEK SPOR FAALİYETİ
     ------------------------------------------------------- */

  if (
    semanticContext.completedEvent
  ) {

    scores.result +=
      5;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        5

      );

  }


  /* -------------------------------------------------------
     GENEL GEÇMİŞ SONUÇ

     Saf idarî süreç değilse kullanılabilir.
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      text,
      [
        "tamamlandi",
        "sona erdi",
        "sampiyon oldu",
        "kupayi kazandi",
        "maglup etti",
        "galip geldi",
        "noktalandı"
      ]
    )
  ) {

    if (
      !semanticContext.pureAdministrativeProcess
    ) {

      scores.result +=
        5;


      scores.opportunity =
        Math.max(

          0,

          scores.opportunity -
          5

        );

    }

  }


  /* -------------------------------------------------------
     BAĞLAMA BAĞLI GEÇMİŞ SPOR DİLİ

     "heyecanı yaşandı"
     "maçlar oynandı"
     "hafta geride kaldı"

     yalnız gerçek event bağlamında kullanılır.
     ------------------------------------------------------- */

  if (
    semanticContext.contextualCompletedLanguage

    &&

    semanticContext.completedEvent
  ) {

    scores.result +=
      6;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        6

      );


    reasons.push(
      "Geçmiş zaman ifadesi gerçek spor organizasyonu bağlamında tamamlanmış olay olarak yorumlandı."
    );

  }


  /* -------------------------------------------------------
     AKTİF KAYIT
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      text,
      [
        "basvurular basladi",
        "kayitlar basladi",
        "basvurular devam ediyor",
        "kayitlar devam ediyor",
        "son basvuru",
        "son kayit"
      ]
    )
  ) {

    scores.registration +=
      8;

  }


  /* -------------------------------------------------------
     ÜRÜN + KAMPANYA
     ------------------------------------------------------- */

  if (
    scores.campaign >=
    10

    &&

    scores.product >
    0
  ) {

    scores.campaign +=
      4;

  }


  /* -------------------------------------------------------
     İŞ İLANI + BAŞVURU
     ------------------------------------------------------- */

  if (
    scores.job >=
    10
  ) {

    scores.registration =
      Math.max(

        0,

        scores.registration -
        5

      );

  }


  /* -------------------------------------------------------
     ÜRÜN / KAMPANYA + FIRSAT
     ------------------------------------------------------- */

  if (
    scores.product >=
    10

    ||

    scores.campaign >=
    10
  ) {

    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        3

      );

  }


  /* -------------------------------------------------------
     SAF İDARİ DUYURU
     ------------------------------------------------------- */

  if (
    semanticContext.pureAdministrativeProcess

    &&

    !hasTransactionalAction(
      post
    )
  ) {

    scores.announcement +=
      5;


    scores.opportunity =
      Math.max(

        0,

        scores.opportunity -
        8

      );

  }


  /* -------------------------------------------------------
     ACTION
     ------------------------------------------------------- */

  if (
    hasActionType(
      post,
      [
        "register",
        "apply"
      ]
    )
  ) {

    scores.registration +=
      5;

  }

}


/* =========================================================
   INTENT SEÇ
   ========================================================= */

function selectIntent(
  scores
) {

  const priority = [

    "job",

    "product",

    "campaign",

    "registration",

    "result",

    "achievement",

    "assignment",

    "transfer",

    "opportunity",

    "announcement",

    "news"

  ];


  let bestKey =
    "news";


  let bestScore =
    -Infinity;


  for (
    const key
    of priority
  ) {

    const score =
      Number(
        scores[
          key
        ] ||
        0
      );


    if (
      score >
      bestScore
    ) {

      bestScore =
        score;


      bestKey =
        key;

    }

  }


  if (
    bestScore <=
    0
  ) {

    return CONTENT_INTENTS.news;

  }


  return bestKey;

}


/* =========================================================
   SEMANTİK EVENT STATUS
   ========================================================= */

function determineEventStatus({

  text,
  contentIntent,
  reasons,
  semanticContext

}) {

  void text;


  /* -------------------------------------------------------
     SPOR SONUCU / BAŞARI
     ------------------------------------------------------- */

  if (
    contentIntent ===
    CONTENT_INTENTS.result

    ||

    contentIntent ===
    CONTENT_INTENTS.achievement
  ) {

    reasons.push(
      "Sonuç/başarı içeriği semantik olarak tamamlanmış olay bildiriyor."
    );


    return EVENT_STATUSES.completed;

  }


  /* -------------------------------------------------------
     TRANSACTIONAL INTENTLER
     ------------------------------------------------------- */

  if (
    [
      CONTENT_INTENTS.registration,
      CONTENT_INTENTS.job,
      CONTENT_INTENTS.product,
      CONTENT_INTENTS.campaign
    ].includes(
      contentIntent
    )
  ) {

    return EVENT_STATUSES.unknown;

  }


  /* -------------------------------------------------------
     TAMAMLANMIŞ GERÇEK ETKİNLİK
     ------------------------------------------------------- */

  if (
    semanticContext.completedEvent
  ) {

    reasons.push(
      "Gerçek spor/etkinlik bağlamında tamamlanmış faaliyet dili bulundu."
    );


    return EVENT_STATUSES.completed;

  }


  /* -------------------------------------------------------
     DEVAM EDEN GERÇEK ETKİNLİK
     ------------------------------------------------------- */

  if (
    semanticContext.ongoingEvent
  ) {

    return EVENT_STATUSES.ongoing;

  }


  /* -------------------------------------------------------
     GELECEK GERÇEK ETKİNLİK
     ------------------------------------------------------- */

  if (
    semanticContext.futureEvent
  ) {

    return EVENT_STATUSES.upcoming;

  }


  /* -------------------------------------------------------
     GELECEK İDARİ SÜREÇ
     ------------------------------------------------------- */

  if (
    semanticContext.futureAdministrativeProcess
  ) {

    reasons.push(
      "Gelecek zaman ifadesi idarî/işlemsel sürece ait olduğu için eventStatus unknown bırakıldı."
    );


    return EVENT_STATUSES.unknown;

  }


  return EVENT_STATUSES.unknown;

}


/* =========================================================
   ACTIONABLE
   ========================================================= */

function determineActionable({

  post,
  text,
  contentIntent,
  eventStatus

}) {

  /* -------------------------------------------------------
     HABER / DUYURU TÜRLERİ
     ------------------------------------------------------- */

  if (
    [
      CONTENT_INTENTS.result,
      CONTENT_INTENTS.achievement,
      CONTENT_INTENTS.assignment,
      CONTENT_INTENTS.transfer,
      CONTENT_INTENTS.news,
      CONTENT_INTENTS.announcement
    ].includes(
      contentIntent
    )
  ) {

    if (
      !hasTransactionalAction(
        post
      )
    ) {

      return false;

    }

  }


  /* -------------------------------------------------------
     DOĞRUDAN ACTION
     ------------------------------------------------------- */

  if (
    hasTransactionalAction(
      post
    )
  ) {

    return true;

  }


  /* -------------------------------------------------------
     TRANSACTIONAL INTENT
     ------------------------------------------------------- */

  if (
    [
      CONTENT_INTENTS.registration,
      CONTENT_INTENTS.campaign,
      CONTENT_INTENTS.job,
      CONTENT_INTENTS.product
    ].includes(
      contentIntent
    )
  ) {

    return true;

  }


  /* -------------------------------------------------------
     OPPORTUNITY
     ------------------------------------------------------- */

  if (
    contentIntent ===
    CONTENT_INTENTS.opportunity

    &&

    eventStatus !==
    EVENT_STATUSES.completed

    &&

    containsAnyPhrase(
      text,
      [
        "katilabilir",
        "katilim icin",
        "basvuru yap",
        "kayit yaptir",
        "bilet al",
        "basvurular basladi",
        "kayitlar basladi"
      ]
    )
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   TRANSACTIONAL ACTION
   ========================================================= */

function hasTransactionalAction(
  post
) {

  return hasActionType(
    post,
    [
      "register",
      "apply",
      "buy",
      "ticket",
      "join",
      "campaign",
      "product",
      "contact"
    ]
  );

}


/* =========================================================
   OPPORTUNITY SCORE
   ========================================================= */

function calculateOpportunityScore({

  contentIntent,
  eventStatus,
  actionable,
  scores

}) {

  let score =
    0;


  switch (
    contentIntent
  ) {

    case CONTENT_INTENTS.registration:

      score =
        82;

      break;


    case CONTENT_INTENTS.opportunity:

      score =
        68;

      break;


    case CONTENT_INTENTS.campaign:

      score =
        78;

      break;


    case CONTENT_INTENTS.job:

      score =
        78;

      break;


    case CONTENT_INTENTS.product:

      score =
        65;

      break;


    case CONTENT_INTENTS.announcement:

      score =
        28;

      break;


    case CONTENT_INTENTS.news:
    case CONTENT_INTENTS.assignment:
    case CONTENT_INTENTS.transfer:

      score =
        15;

      break;


    case CONTENT_INTENTS.achievement:

      score =
        10;

      break;


    case CONTENT_INTENTS.result:

      score =
        8;

      break;


    default:

      score =
        0;

  }


  if (
    actionable
  ) {

    score +=
      10;

  }


  if (
    eventStatus ===
    EVENT_STATUSES.upcoming
  ) {

    score +=
      8;

  }


  if (
    eventStatus ===
    EVENT_STATUSES.completed
  ) {

    score -=
      8;

  }


  if (
    Number(
      scores.registration ||
      0
    ) >=
    18
  ) {

    score +=
      5;

  }


  return clamp(

    Math.round(
      score
    ),

    0,

    100

  );

}


/* =========================================================
   FEED TREATMENT
   ========================================================= */

function determineFeedTreatment({

  contentIntent,
  actionable,
  opportunityScore

}) {

  if (
    actionable

    &&

    opportunityScore >=
    70
  ) {

    return "promote";

  }


  if (
    [
      CONTENT_INTENTS.news,
      CONTENT_INTENTS.result,
      CONTENT_INTENTS.achievement,
      CONTENT_INTENTS.assignment,
      CONTENT_INTENTS.transfer,
      CONTENT_INTENTS.announcement
    ].includes(
      contentIntent
    )
  ) {

    return "inform";

  }


  return "normal";

}


/* =========================================================
   CONFIDENCE
   ========================================================= */

function calculateConfidenceScore(
  scores,
  selected
) {

  const values =
    Object.entries(
      scores
    )

      .map(
        ([key, score]) => ({

          key:
            key,

          score:
            Number(
              score ||
              0
            )

        })
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const first =
    values[0]?.score ||
    0;


  const second =
    values[1]?.score ||
    0;


  let confidence =
    35;


  if (
    first >=
    6
  ) {

    confidence +=
      15;

  }


  if (
    first >=
    12
  ) {

    confidence +=
      15;

  }


  if (
    first >=
    20
  ) {

    confidence +=
      10;

  }


  const difference =
    first -
    second;


  if (
    difference >=
    5
  ) {

    confidence +=
      10;

  }


  if (
    difference >=
    12
  ) {

    confidence +=
      10;

  }


  if (
    selected ===
    CONTENT_INTENTS.news

    &&

    first <=
    2
  ) {

    confidence =
      35;

  }


  return clamp(

    Math.round(
      confidence
    ),

    0,

    100

  );

}


/* =========================================================
   SEARCH TEXT
   ========================================================= */

function buildSearchText(
  post
) {

  const values = [

    post?.editorial?.originalTitle,

    post?.editorial?.originalText,

    post?.originalTitle,

    post?.originalText,

    post?.title,

    post?.summary,

    post?.editorial?.headline,

    post?.editorial?.influencerText,

    post?.source?.name,

    post?.source?.shortName,

    post?.sport,

    post?.section,

    post?.category,

    post?.subCategory,

    post?.contentType,

    post?.providerType

  ];


  if (
    Array.isArray(
      post?.tags
    )
  ) {

    values.push(
      ...post.tags
    );

  }


  if (
    isPlainObject(
      post?.details
    )
  ) {

    values.push(
      ...flattenValues(
        post.details
      )
    );

  }


  if (
    isPlainObject(
      post?.facts
    )
  ) {

    values.push(
      ...flattenValues(
        post.facts
      )
    );

  }


  return normalizeText(

    values

      .filter(
        value =>
          value !==
          null

          &&

          value !==
          undefined
      )

      .join(
        " "
      )

  );

}


/* =========================================================
   BAŞLIK METNİ
   ========================================================= */

function buildTitleText(
  post
) {

  return normalizeText(

    post?.editorial?.originalTitle

    ||

    post?.originalTitle

    ||

    post?.editorial?.headline

    ||

    post?.title

    ||

    ""

  );

}


/* =========================================================
   SCORE PATTERNS
   ========================================================= */

function scorePatterns({

  text,
  target,
  key,
  patterns,
  reasons,
  reasonLabel

}) {

  for (
    const [
      pattern,
      weight
    ]
    of patterns
  ) {

    if (
      !containsPhrase(
        text,
        pattern
      )
    ) {

      continue;

    }


    target[
      key
    ] +=
      Number(
        weight
      ) ||
      0;


    if (
      Number(
        weight
      ) >=
      9
    ) {

      reasons.push(
        `${reasonLabel}: "${pattern}"`
      );

    }

  }

}


/* =========================================================
   ACTION TYPE
   ========================================================= */

function hasActionType(
  post,
  types
) {

  if (
    !Array.isArray(
      post?.actions
    )
  ) {

    return false;

  }


  const normalizedTypes =
    types.map(
      normalizeId
    );


  return post.actions.some(
    action => {

      if (
        !action

        ||

        action.enabled ===
        false
      ) {

        return false;

      }


      return normalizedTypes.includes(
        normalizeId(
          action.type
        )
      );

    }
  );

}


/* =========================================================
   FLATTEN OBJECT VALUES
   ========================================================= */

function flattenValues(
  value
) {

  const output =
    [];


  if (
    !isPlainObject(
      value
    )
  ) {

    return output;

  }


  for (
    const item
    of Object.values(
      value
    )
  ) {

    if (
      item ===
      null

      ||

      item ===
      undefined
    ) {

      continue;

    }


    if (
      Array.isArray(
        item
      )
    ) {

      output.push(
        ...item
      );


      continue;

    }


    if (
      isPlainObject(
        item
      )
    ) {

      output.push(
        ...flattenValues(
          item
        )
      );


      continue;

    }


    output.push(
      item
    );

  }


  return output;

}


/* =========================================================
   PHRASE MATCH

   "sampiyon"
   "sampiyona"

   birbirine karışmaz.
   ========================================================= */

function containsPhrase(
  text,
  value
) {

  const haystack =
    ` ${normalizeText(
      text
    )} `;


  const needle =
    normalizeText(
      value
    );


  if (
    !needle
  ) {

    return false;

  }


  return haystack.includes(
    ` ${needle} `
  );

}


/* =========================================================
   ANY PHRASE
   ========================================================= */

function containsAnyPhrase(
  text,
  values
) {

  if (
    !Array.isArray(
      values
    )
  ) {

    return false;

  }


  return values.some(
    value =>
      containsPhrase(
        text,
        value
      )
  );

}


/* =========================================================
   FRAGMENT MATCH

   Kontrollü semantik bağlam tespiti için kullanılır.
   ========================================================= */

function containsFragment(
  text,
  value
) {

  const haystack =
    normalizeText(
      text
    );


  const needle =
    normalizeText(
      value
    );


  if (
    !haystack ||
    !needle
  ) {

    return false;

  }


  return haystack.includes(
    needle
  );

}


/* =========================================================
   ANY FRAGMENT
   ========================================================= */

function containsAnyFragment(
  text,
  values
) {

  if (
    !Array.isArray(
      values
    )
  ) {

    return false;

  }


  return values.some(
    value =>
      containsFragment(
        text,
        value
      )
  );

}


/* =========================================================
   HAS USEFUL VALUE
   ========================================================= */

function hasUsefulValue(
  value
) {

  if (
    value ===
    null

    ||

    value ===
    undefined
  ) {

    return false;

  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value.length >
    0;

  }


  if (
    typeof value ===
    "string"
  ) {

    return Boolean(
      value.trim()
    );

  }


  return true;

}


/* =========================================================
   SCORE ROUND
   ========================================================= */

function roundScores(
  scores
) {

  const result =
    {};


  for (
    const [
      key,
      value
    ]
    of Object.entries(
      scores
    )
  ) {

    result[
      key
    ] =
      Math.round(

        Number(
          value ||
          0
        )

        *

        100

      )
      /
      100;

  }


  return result;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackResult() {

  return {

    version:
      CONTENT_INTENT_VERSION,

    contentIntent:
      CONTENT_INTENTS.news,

    eventStatus:
      EVENT_STATUSES.unknown,

    actionable:
      false,

    opportunityScore:
      0,

    confidenceScore:
      0,

    feedTreatment:
      "inform",

    context: {

      eventObject:
        false,

      eventObjectInTitle:
        false,

      administrativeProcess:
        false,

      pureAdministrativeProcess:
        false,

      futureLanguage:
        false,

      futureEvent:
        false,

      futureAdministrativeProcess:
        false,

      ongoingEvent:
        false,

      completedLanguage:
        false,

      contextualCompletedLanguage:
        false,

      completedEvent:
        false,

      achievementLanguage:
        false

    },

    scores:
      createScoreMap(),

    reasons:
      [],

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   NORMALIZE ID
   ========================================================= */

function normalizeId(
  value
) {

  return normalizeText(
    value
  )

    .replace(
      /[^a-z0-9]+/g,
      "_"
    )

    .replace(
      /^_+|_+$/g,
      ""
    );

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
  value
) {

  return String(
    value ??
    ""
  )

    .toLocaleLowerCase(
      "tr-TR"
    )

    .replaceAll(
      "ç",
      "c"
    )

    .replaceAll(
      "ğ",
      "g"
    )

    .replaceAll(
      "ı",
      "i"
    )

    .replaceAll(
      "ö",
      "o"
    )

    .replaceAll(
      "ş",
      "s"
    )

    .replaceAll(
      "ü",
      "u"
    )

    .replace(
      /[^a-z0-9%]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   PLAIN OBJECT
   ========================================================= */

function isPlainObject(
  value
) {

  return Boolean(

    value

    &&

    typeof value ===
    "object"

    &&

    !Array.isArray(
      value
    )

  );

}


/* =========================================================
   CLAMP
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  const number =
    Number(
      value
    );


  const safe =
    Number.isFinite(
      number
    )
      ? number
      : 0;


  return Math.max(

    min,

    Math.min(
      max,
      safe
    )

  );

       }
