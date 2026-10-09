/* =========================================================
   SporNRD
   worker/learning/feedbackEngine.js

   Kullanıcı geri bildirimlerinden öğrenme motoru
   SporNRD v6.0.4
   ========================================================= */


import {
  ACTION_WEIGHT
} from "../intelligence/defaultWeights.js";


import {
  readLearningState,
  writeLearningState
} from "./learningStore.js";


/* =========================================================
   GERİ BİLDİRİM KAYDI
   ========================================================= */

export async function recordFeedback(
  env,
  payload
) {

  /* -------------------------------------------------------
     AKSİYON
     ------------------------------------------------------- */

  const action =
    String(
      payload?.action ||
      ""
    )
      .trim()
      .toLocaleLowerCase(
        "tr-TR"
      );


  /* -------------------------------------------------------
     KATEGORİ
     ------------------------------------------------------- */

  const category =
    String(
      payload?.category ||
      "announcement"
    )
      .trim()
      .toLocaleLowerCase(
        "tr-TR"
      );


  /* -------------------------------------------------------
     KAYNAK

     Öncelik sourceId:
     tyf
     tbf
     tvf
     ...

     Böylece federasyon adı değişse bile
     öğrenme anahtarı değişmez.
     ------------------------------------------------------- */

  const source =
    String(
      payload?.sourceId ||
      payload?.source ||
      "unknown"
    )
      .trim()
      .toLocaleLowerCase(
        "tr-TR"
      );


  /* -------------------------------------------------------
     AKSİYON AĞIRLIĞI
     ------------------------------------------------------- */

  const delta =
    Number(
      ACTION_WEIGHT[
        action
      ] ||
      0
    );


  /* =======================================================
     ÖĞRENME DURUMUNU OKU
     ======================================================= */

  const state =
    await readLearningState(
      env
    );


  /* =======================================================
     GEREKLİ ALANLARI GARANTİ ALTINA AL
     ======================================================= */

  if (
    !isPlainObject(
      state.categoryBoosts
    )
  ) {

    state.categoryBoosts =
      {};

  }


  if (
    !isPlainObject(
      state.sourceBoosts
    )
  ) {

    state.sourceBoosts =
      {};

  }


  if (
    !isPlainObject(
      state.actionCounts
    )
  ) {

    state.actionCounts =
      {};

  }


  /* =======================================================
     KATEGORİ ÖĞRENMESİ
     ======================================================= */

  state.categoryBoosts[
    category
  ] =
    clamp(

      Number(
        state.categoryBoosts[
          category
        ] ||
        0
      )
      +
      delta *
      0.08,

      -4,

      8

    );


  /* =======================================================
     KAYNAK / FEDERASYON ÖĞRENMESİ
     ======================================================= */

  state.sourceBoosts[
    source
  ] =
    clamp(

      Number(
        state.sourceBoosts[
          source
        ] ||
        0
      )
      +
      delta *
      0.03,

      -3,

      5

    );


  /* =======================================================
     AKSİYON SAYACI
     ======================================================= */

  state.actionCounts[
    action
  ] =
    Number(
      state.actionCounts[
        action
      ] ||
      0
    )
    +
    1;


  /* =======================================================
     TOPLAM ÖĞRENME SİNYALİ
     ======================================================= */

  state.totalSignals =
    Number(
      state.totalSignals ||
      0
    )
    +
    1;


  state.updatedAt =
    new Date()
      .toISOString();


  /* =======================================================
     KAYDET
     ======================================================= */

  const persisted =
    await writeLearningState(
      env,
      state
    );


  /* =======================================================
     SONUÇ
     ======================================================= */

  return {

    persisted:
      Boolean(
        persisted
      ),

    action:
      action,

    category:
      category,

    source:
      source,

    delta:
      delta,

    state:
      state

  };

}


/* =========================================================
   SAYI SINIRLAMA
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  const numericValue =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numericValue
    )
  ) {

    return 0;

  }


  return Math.max(

    min,

    Math.min(
      max,
      numericValue
    )

  );

}


/* =========================================================
   DÜZ NESNE KONTROLÜ
   ========================================================= */

function isPlainObject(
  value
) {

  return Boolean(

    value &&

    typeof value ===
    "object" &&

    !Array.isArray(
      value
    )

  );

}
