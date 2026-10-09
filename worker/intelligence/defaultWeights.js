/* =========================================================
   SporNRD
   worker/intelligence/defaultWeights.js

   Varsayılan öğrenme ağırlıkları
   SporNRD v6.0.4
   ========================================================= */


/* =========================================================
   KULLANICI AKSİYON AĞIRLIKLARI

   Pozitif değer:
   içerik / kategori / kaynak daha değerli

   Negatif değer:
   içerik / kategori / kaynak daha düşük değerli
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
   EDİTÖR / SIRALAMA AĞIRLIKLARI

   relevanceEngine.js veya ilerideki motorlar
   doğrudan kullanabilir.
   ========================================================= */

export const DEFAULT_WEIGHTS = {

  relevance:
    1.0,

  quality:
    0.7,

  freshness:
    0.8,

  sourceTrust:
    1.0,

  learning:
    0.6,

  urgency:
    0.4,

  actionRequired:
    0.4,

  verifiedSource:
    0.5

};


/* =========================================================
   VARSAYILAN ÖĞRENME DURUMU
   ========================================================= */

export const DEFAULT_LEARNING_STATE = {

  version:
    1,


  /* -------------------------------------------------------
     KATEGORİ TERCİHLERİ
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     FEDERASYON / KAYNAK TERCİHLERİ

     Örnek:
     tyf: 0.8
     tbf: 1.2

     Başlangıçta boş.
     ------------------------------------------------------- */

  sourceBoosts:
    {},


  /* -------------------------------------------------------
     BAŞLIK STİLİ ÖĞRENMESİ

     İleride:
     direct
     informative
     action
     location
     fact-rich
     ------------------------------------------------------- */

  headlineStyleBoosts: {

    direct:
      0,

    informative:
      0,

    action:
      0,

    location:
      0,

    "fact-rich":
      0,

    interest:
      0,

    source:
      0

  },


  /* -------------------------------------------------------
     ETKİLEŞİM SAYILARI
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     GENEL İSTATİSTİKLER
     ------------------------------------------------------- */

  totalSignals:
    0,

  updatedAt:
    null

};
