/* =========================================================
   SporNRD
   worker/intelligence/classifier.js

   Haber kategori + hedef kitle sınıflandırıcısı
   SporNRD v6.0.4
   ========================================================= */


import {
  normalize
} from "../utils/html.js";


/* =========================================================
   ANA SINIFLANDIRICI
   ========================================================= */

export function classifyArticle(
  title,
  body
) {

  const titleText =
    normalize(
      title
    );


  const allText =
    normalize(
      `${title || ""} ${body || ""}`
    );


  /* =======================================================
     AKIŞA ALINMAYACAK KURUMSAL İÇERİKLER
     ======================================================= */

  if (
    hasAny(
      titleText,
      [

        "GENEL KURUL",

        "DELEGE",

        "IHALE",

        "SATIN ALMA",

        "YONETIM KURULU",

        "DISIPLIN KURULU",

        "VEFAT",

        "BASSAGLIGI",

        "BASKAN MESAJI",

        "ZIYARET"

      ]
    )
  ) {

    return result(
      false,
      "announcement",
      "general",
      0,
      false
    );

  }


  /* =======================================================
     SPORCU / MİLLİ TAKIM / SEM / TOHM
     ======================================================= */

  if (
    hasAny(
      titleText,
      [

        "SPORCU",

        "SEM ",

        "SEM)",

        "SEM-",

        "TOHM",

        "MILLI TAKIM",

        "MILLI SPORCU",

        "ADAY KADRO",

        "KADROSU"

      ]
    )
  ) {

    return result(

      true,

      "athlete",

      "sporcu",

      10,

      hasAny(
        allText,
        [

          "BASVURU",

          "KAYIT",

          "SON BASVURU",

          "HAK KAZANAN",

          "KAYIT HAKKI"

        ]
      )

    );

  }


  /* =======================================================
     ANTRENÖR
     ======================================================= */

  if (
    hasAny(
      titleText,
      [

        "ANTRENOR",

        "ANTRENORLUK",

        "ANTRENORU",

        "ANTRENORLER"

      ]
    )
  ) {

    return result(

      true,

      "coach",

      "antrenör",

      10,

      hasAny(
        allText,
        [

          "BASVURU",

          "KAYIT",

          "SON BASVURU",

          "KURS",

          "VIZE"

        ]
      )

    );

  }


  /* =======================================================
     YARIŞMA / ŞAMPİYONA / LİG
     ======================================================= */

  if (
    hasAny(
      titleText,
      [

        "SAMPIYONA",

        "MUSABAKA",

        "YARISMA",

        "YARIS",

        "LIG",

        "KUPA",

        "TURNUVA",

        "FINAL",

        "FINAL FOUR",

        "FIKSTUR"

      ]
    )
  ) {

    return result(
      true,
      "event",
      "sporcu",
      9,
      false
    );

  }


  /* =======================================================
     EĞİTİM / SEMİNER / KURS
     ======================================================= */

  if (
    hasAny(
      titleText,
      [

        "KURS",

        "SEMINER",

        "EGITIM",

        "SERTIFIKA",

        "GELISIM PROGRAMI"

      ]
    )
  ) {

    return result(

      true,

      "education",

      "general",

      7,

      hasAny(
        allText,
        [

          "BASVURU",

          "KAYIT",

          "SON BASVURU"

        ]
      )

    );

  }


  /* =======================================================
     GENEL ÖNEMLİ DUYURULAR
     ======================================================= */

  if (
    hasAny(
      allText,
      [

        "BASVURU",

        "KAYIT",

        "KRITER",

        "DUYURU",

        "TAKVIM",

        "BILGILENDIRME",

        "PROGRAM",

        "LISTE",

        "SONUC",

        "SONUCLARI"

      ]
    )
  ) {

    return result(

      true,

      "announcement",

      "general",

      5,

      hasAny(
        allText,
        [

          "BASVURU",

          "KAYIT",

          "SON BASVURU"

        ]
      )

    );

  }


  /* =======================================================
     SPORNRD İÇİN ANLAMSIZ / DÜŞÜK DEĞERLİ İÇERİK
     ======================================================= */

  return result(
    false,
    "announcement",
    "general",
    0,
    false
  );

}


/* =========================================================
   ANAHTAR KELİME KONTROLÜ
   ========================================================= */

function hasAny(
  text,
  list
) {

  if (
    !text ||
    !Array.isArray(
      list
    )
  ) {

    return false;

  }


  return list.some(
    item =>
      text.includes(
        item
      )
  );

}


/* =========================================================
   STANDART SONUÇ
   ========================================================= */

function result(
  keep,
  category,
  audience,
  score,
  actionRequired = false
) {

  return {

    keep:
      Boolean(
        keep
      ),

    category:
      category,

    audience:
      audience,

    score:
      Number(
        score ||
        0
      ),

    actionRequired:
      Boolean(
        actionRequired
      )

  };

      }
