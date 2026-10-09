/* =========================================================
   SporNRD
   worker/learning/feedbackEngine.js

   Kullanıcı geri bildirimlerinden öğrenme motoru
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

  const action =
    String(
      payload?.action ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    String(
      payload?.category ||
      "announcement"
    )
      .trim()
      .toLowerCase();


  const source =
    String(
      payload?.source ||
      payload?.sourceId ||
      "unknown"
    )
      .trim()
      .toLowerCase();


  const delta =
    Number(
      ACTION_WEIGHT[
        action
      ] ||
      0
    );


  /* -------------------------------------------------------
     Öğrenme durumunu oku
     ------------------------------------------------------- */

  const state =
    await readLearningState(
      env
    );


  /* -------------------------------------------------------
     Gerekli alanları garanti altına al
     ------------------------------------------------------- */

  if (
    !state.categoryBoosts ||
    typeof state.categoryBoosts !==
    "object"
  ) {

    state.categoryBoosts =
      {};

  }


  if (
    !state.sourceBoosts ||
    typeof state.sourceBoosts !==
    "object"
  ) {

    state.sourceBoosts =
      {};

  }


  if (
    !state.actionCounts ||
    typeof state.actionCounts !==
    "object"
  ) {

    state.actionCounts =
      {};

  }


  /* -------------------------------------------------------
     KATEGORİ ÖĞRENMESİ
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     KAYNAK ÖĞRENMESİ
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     AKSİYON SAYACI
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     TOPLAM SİNYAL
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     KAYDET
     ------------------------------------------------------- */

  const persisted =
    await writeLearningState(
      env,
      state
    );


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
