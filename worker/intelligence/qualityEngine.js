/* =========================================================
   SporNRD
   worker/intelligence/qualityEngine.js

   Başlık + özet kalite puanlama motoru
   SporNRD v6.0.4
   ========================================================= */


import {
  normalize
} from "../utils/html.js";


/* =========================================================
   CLICKBAIT / KALİTESİZ BAŞLIK KELİMELERİ
   ========================================================= */

const CLICKBAIT = [

  "ŞOK",

  "İNANILMAZ",

  "BOMBA",

  "KAÇIRMAYIN",

  "HERKES BUNU KONUŞUYOR",

  "SON DAKİKA",

  "İŞTE DETAYLAR",

  "GÖRENLER ŞAŞIRDI",

  "BU HABER ÇOK KONUŞULACAK"

];


/* =========================================================
   BAŞLIK PUANI
   ========================================================= */

export function scoreHeadline(
  candidate,
  facts = {}
) {

  const text =
    String(
      candidate ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    !text
  ) {

    return -100;

  }


  let score =
    50;


  const length =
    text.length;


  /* =======================================================
     UZUNLUK
     ======================================================= */

  if (
    length >= 36 &&
    length <= 88
  ) {

    score +=
      15;

  }

  else if (
    length >= 26 &&
    length <= 105
  ) {

    score +=
      7;

  }

  else if (
    length < 24 ||
    length > 120
  ) {

    score -=
      12;

  }


  /* =======================================================
     KONUM
     ======================================================= */

  if (
    isRealLocation(
      facts.location
    ) &&
    normalize(
      text
    ).includes(
      normalize(
        facts.location
      )
    )
  ) {

    score +=
      6;

  }


  /* =======================================================
     ETKİNLİK TARİHİ
     ======================================================= */

  if (
    facts.eventDate &&
    text.includes(
      String(
        facts.eventDate
      )
    )
  ) {

    score +=
      7;

  }


  /* =======================================================
     KADEME
     ======================================================= */

  if (
    facts.grade &&
    normalize(
      text
    ).includes(
      normalize(
        String(
          facts.grade
        )
      )
    )
  ) {

    score +=
      5;

  }


  /* =======================================================
     HABER KONUSU
     ======================================================= */

  if (
    facts.topic &&
    containsMeaningfulTopic(
      text,
      facts.topic
    )
  ) {

    score +=
      5;

  }


  /* =======================================================
     KULLANICININ İŞLEM YAPMASI GEREKEN HABER
     ======================================================= */

  if (
    facts.actionRequired
  ) {

    const normalized =
      normalize(
        text
      );


    if (
      containsAny(
        normalized,
        [
          "BASVURU",
          "KAYIT",
          "LISTE",
          "KURS",
          "DUYURU",
          "SONUC"
        ]
      )
    ) {

      score +=
        4;

    }

    else {

      score +=
        1;

    }

  }


  /* =======================================================
     CLICKBAIT CEZASI
     ======================================================= */

  const normalizedText =
    normalize(
      text
    );


  for (
    const bad
    of CLICKBAIT
  ) {

    if (
      normalizedText.includes(
        normalize(
          bad
        )
      )
    ) {

      score -=
        25;

    }

  }


  /* =======================================================
     NOKTALAMA KALİTESİ
     ======================================================= */

  if (
    /!{2,}/.test(
      text
    )
  ) {

    score -=
      10;

  }


  if (
    (
      text.match(
        /\?/g
      ) ||
      []
    ).length > 1
  ) {

    score -=
      8;

  }


  if (
    /\.{3,}/.test(
      text
    )
  ) {

    score -=
      5;

  }


  /* =======================================================
     TAMAMI BÜYÜK HARF CEZASI
     ======================================================= */

  if (
    isMostlyUppercase(
      text
    )
  ) {

    score -=
      8;

  }


  /* =======================================================
     GERÇEK BİLGİ YOĞUNLUĞU
     ======================================================= */

  if (
    /\d/.test(
      text
    )
  ) {

    score +=
      2;

  }


  if (
    text.includes(
      ":"
    )
  ) {

    score +=
      1;

  }


  return roundScore(
    score
  );

}


/* =========================================================
   ÖZET PUANI
   ========================================================= */

export function scoreSummary(
  summary,
  facts = {}
) {

  const text =
    String(
      summary ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    !text
  ) {

    return 0;

  }


  let score =
    50;


  const length =
    text.length;


  /* =======================================================
     UZUNLUK
     ======================================================= */

  if (
    length >= 100 &&
    length <= 360
  ) {

    score +=
      15;

  }

  else if (
    length >= 70 &&
    length < 100
  ) {

    score +=
      7;

  }

  else if (
    length > 420
  ) {

    score -=
      10;

  }

  else if (
    length < 45
  ) {

    score -=
      8;

  }


  /* =======================================================
     AKSİYON GEREKTİREN İÇERİK
     ======================================================= */

  if (
    facts.actionRequired &&
    /gerek|başvuru|kayıt|tamamla|son tarih|son başvuru/i.test(
      text
    )
  ) {

    score +=
      8;

  }


  /* =======================================================
     ETKİNLİK TARİHİ
     ======================================================= */

  if (
    facts.eventDate &&
    text.includes(
      String(
        facts.eventDate
      )
    )
  ) {

    score +=
      6;

  }


  /* =======================================================
     KONUM
     ======================================================= */

  if (
    isRealLocation(
      facts.location
    ) &&
    normalize(
      text
    ).includes(
      normalize(
        facts.location
      )
    )
  ) {

    score +=
      4;

  }


  /* =======================================================
     SON BAŞVURU / TARİH
     ======================================================= */

  if (
    facts.deadlineText &&
    text.includes(
      String(
        facts.deadlineText
      )
    )
  ) {

    score +=
      6;

  }


  /* =======================================================
     İŞ GÜNÜ
     ======================================================= */

  if (
    facts.businessDays &&
    text.includes(
      String(
        facts.businessDays
      )
    )
  ) {

    score +=
      4;

  }


  /* =======================================================
     SAYISAL / SOMUT BİLGİ
     ======================================================= */

  if (
    /\d/.test(
      text
    )
  ) {

    score +=
      3;

  }


  /* =======================================================
     RESMÎ KAYNAK VURGUSU
     ======================================================= */

  if (
    /resmî kaynak|resmi kaynak|resmî duyuru|resmi duyuru|federasyon/i.test(
      text
    )
  ) {

    score +=
      2;

  }


  /* =======================================================
     CLICKBAIT CEZASI
     ======================================================= */

  const normalizedText =
    normalize(
      text
    );


  for (
    const bad
    of CLICKBAIT
  ) {

    if (
      normalizedText.includes(
        normalize(
          bad
        )
      )
    ) {

      score -=
        20;

    }

  }


  /* =======================================================
     AŞIRI NOKTALAMA CEZASI
     ======================================================= */

  if (
    /!{2,}/.test(
      text
    )
  ) {

    score -=
      8;

  }


  return roundScore(
    score
  );

}


/* =========================================================
   GERÇEK KONUM MU?
   ========================================================= */

function isRealLocation(
  value
) {

  const location =
    String(
      value ||
      ""
    )
      .trim();


  return Boolean(

    location &&

    location !==
    "Türkiye"

  );

}


/* =========================================================
   HABER KONUSU BAŞLIKTA VAR MI?
   ========================================================= */

function containsMeaningfulTopic(
  text,
  topic
) {

  const normalizedText =
    normalize(
      text
    );


  const normalizedTopic =
    normalize(
      topic
    );


  if (
    !normalizedTopic ||
    normalizedTopic.length < 4
  ) {

    return false;

  }


  const words =
    normalizedTopic
      .split(
        /\s+/
      )
      .filter(
        word =>
          word.length >= 4
      );


  if (
    !words.length
  ) {

    return false;

  }


  return words.some(
    word =>
      normalizedText.includes(
        word
      )
  );

}


/* =========================================================
   ANAHTAR KELİME
   ========================================================= */

function containsAny(
  text,
  list
) {

  return list.some(
    item =>
      text.includes(
        item
      )
  );

}


/* =========================================================
   AŞIRI BÜYÜK HARF KONTROLÜ
   ========================================================= */

function isMostlyUppercase(
  value
) {

  const letters =
    String(
      value ||
      ""
    )
      .replace(
        /[^A-Za-zÇĞİÖŞÜçğıöşü]/g,
        ""
      );


  if (
    letters.length < 12
  ) {

    return false;

  }


  const upper =
    letters
      .split(
        ""
      )
      .filter(
        character =>
          character ===
          character.toLocaleUpperCase(
            "tr-TR"
          ) &&
          character !==
          character.toLocaleLowerCase(
            "tr-TR"
          )
      )
      .length;


  return (
    upper /
    letters.length
  ) > 0.8;

}


/* =========================================================
   PUAN YUVARLAMA
   ========================================================= */

function roundScore(
  value
) {

  const numeric =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numeric
    )
  ) {

    return 0;

  }


  return (
    Math.round(
      numeric *
      100
    )
    /
    100
  );

      }
