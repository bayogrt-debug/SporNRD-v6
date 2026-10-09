/* =========================================================
   SporNRD
   worker/intelligence/defaultWeights.js

   Varsayılan öğrenme ve sıralama ağırlıkları
   SporNRD v6.0.4
   ========================================================= */


/* =========================================================
   KULLANICI AKSİYON AĞIRLIKLARI

   Pozitif:
   Kullanıcı içeriği değerli buluyor.

   Negatif:
   Kullanıcı içeriği görmek istemiyor.
   ========================================================= */

export const ACTION_WEIGHT = {

  /* -------------------------------------------------------
     Ana etkileşimler
     ------------------------------------------------------- */

  wow:
    3,

  trash:
    -6,

  save:
    4,

  share:
    5,

  detail:
    2,

  source:
    3,


  /* -------------------------------------------------------
     Anlık tepkiler
     ------------------------------------------------------- */

  fire:
    2.5,

  clap:
    2,

  strong:
    2,

  surprised:
    1.5,

  trophy:
    3

};


/* =========================================================
   SIRALAMA MOTORU AĞIRLIKLARI
   ========================================================= */

export const DEFAULT_WEIGHTS = {

  /* Haberin temel SporNRD ilgi puanı */

  relevance:
    1.0,


  /* Başlık + açıklama + görsel kalitesi */

  quality:
    0.7,


  /* Haber güncelliği */

  freshness:
    0.8,


  /* Resmî / güvenilir kaynak */

  sourceTrust:
    1.0,


  /* Kullanıcı davranışlarından öğrenme */

  learning:
    0.6,


  /* Acil / önemli içerik */

  urgency:
    0.4,


  /* Kullanıcının işlem yapması gereken içerik */

  actionRequired:
    0.4,


  /* Doğrulanmış federasyon / kaynak */

  verifiedSource:
    0.5

};


/* =========================================================
   VARSAYILAN ÖĞRENME DURUMU
   ========================================================= */

export const DEFAULT_LEARNING_STATE = {

  version:
    1,


  /* =======================================================
     KATEGORİ TERCİHLERİ
     ======================================================= */

  categoryBoosts: {

    announcement:
      0,

    athlete:
      0,

    coach:
      0,

    education:
      0,

    event:
      0

  },


  /* =======================================================
     FEDERASYON / KAYNAK TERCİHLERİ

     Zamanla örnek:
     tyf: 1.2
     tbf: 0.8
     tvf: 2.1
     ======================================================= */

  sourceBoosts:
    {},


  /* =======================================================
     BAŞLIK STİLİ ÖĞRENMESİ

     Kullanıcının hangi tür başlıklara daha fazla
     Woow / Kaydet / Paylaş verdiğini öğrenebilir.
     ======================================================= */

  headlineStyleBoosts: {

    direct:
      0,

    informative:
      0,

    action:
      0,

    location:
      0,

    date:
      0,

    "fact-rich":
      0,

    interest:
      0,

    source:
      0

  },


  /* =======================================================
     ETKİLEŞİM SAYILARI
     ======================================================= */

  actionCounts: {

    wow:
      0,

    trash:
      0,

    save:
      0,

    share:
      0,

    detail:
      0,

    source:
      0,

    fire:
      0,

    clap:
      0,

    strong:
      0,

    surprised:
      0,

    trophy:
      0

  },


  /* =======================================================
     GENEL İSTATİSTİKLER
     ======================================================= */

  totalSignals:
    0,

  updatedAt:
    null

};
