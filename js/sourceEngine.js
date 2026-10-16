window.SPORNRD_SOURCE_ENGINE = {


  normalizeItem(rawItem) {

    const registry =
      window.SPORNRD_SOURCE_REGISTRY ||
      {};


    const source =
      registry[
        rawItem.sourceKey
      ] ||
      {

        category:
          "media",

        sourceType:
          "KAYNAK",

        trustScore:
          60,

        verified:
          false

      };


    return {

      id:
        this.createId(
          rawItem.externalId
        ),

      externalId:
        rawItem.externalId,

      external:
        true,

      type:
        this.resolvePostType(
          rawItem,
          source
        ),

      source:
        rawItem.sourceName ||
        source.name ||
        "SporNRD Kaynağı",

      sourceType:
        source.sourceType,

      sourceKey:
        rawItem.sourceKey,

      trustScore:
        source.trustScore,

      verified:
        source.verified,

      time:
        rawItem.date ||
        "Şimdi",

      sport:
        rawItem.sport ||
        "Spor",

      location:
        rawItem.location ||
        "Türkiye",

      title:
        rawItem.title ||
        "SporNRD",

      description:
        rawItem.description ||
        "",

      media:
        rawItem.image ||
        "",

      mediaType:
        rawItem.image
          ? "image"
          : "",

      emoji:
        this.resolveEmoji(
          rawItem.contentType
        ),

      sourceUrl:
        rawItem.url ||
        "",

      cta:
        this.resolveActions(
          rawItem
        )

    };

  },



  normalizeAll(items) {

    if (
      !Array.isArray(items)
    ) {

      return [];

    }


    return items

      .filter(Boolean)

      .map(

        item =>
          this.normalizeItem(
            item
          )

      );

  },



  resolvePostType(
    item,
    source
  ) {

    switch (
      item.contentType
    ) {

      case "athlete":
        return "athlete";

      case "coach":
        return "coach";

      case "event":
        return "event";

      case "product":
        return "product";

      case "course":

        return source.category ===
          "official"
            ? "official"
            : "club";

      case "selection":

        return source.category ===
          "official"
            ? "official"
            : "club";

      default:

        return (
          source.category ||
          "media"
        );

    }

  },



  resolveEmoji(
    contentType
  ) {

    const emojiMap = {

      news:
        "📰",

      athlete:
        "🏅",

      coach:
        "🧑‍🏫",

      course:
        "🎯",

      selection:
        "🏆",

      event:
        "📅",

      product:
        "🛍️",

      job:
        "💼",

      facility:
        "🏟️",

      result:
        "🥇"

    };


    return (
      emojiMap[
        contentType
      ] ||
      "🏆"
    );

  },



  resolveActions(
    item
  ) {

    if (
      item.action
    ) {

      return [
        "Detay",
        item.action
      ];

    }


    const actionMap = {

      news:
        [
          "Habere Git"
        ],

      athlete:
        [
          "Detay",
          "Takip Et"
        ],

      coach:
        [
          "Detay",
          "Takip Et"
        ],

      course:
        [
          "Detay",
          "Başvur"
        ],

      selection:
        [
          "Detay",
          "Ön Kayıt"
        ],

      event:
        [
          "Detay",
          "Katıl"
        ],

      product:
        [
          "Ürünü Gör",
          "Satın Al"
        ],

      job:
        [
          "Detay",
          "Başvur"
        ]

    };


    return (
      actionMap[
        item.contentType
      ] ||
      [
        "Detay"
      ]
    );

  },



  createId(value) {

    const text =
      String(
        value ||
        Date.now()
      );


    let hash =
      0;


    for (
      let i = 0;
      i < text.length;
      i++
    ) {

      hash =
        (
          (
            hash << 5
          ) -
          hash
        ) +
        text.charCodeAt(i);


      hash |= 0;

    }


    return (
      Math.abs(hash) +
      2000000000
    );

  },



  mergeWithPosts(
    existingPosts,
    externalItems
  ) {

    const current =
      Array.isArray(
        existingPosts
      )
        ? [...existingPosts]
        : [];


    const normalized =
      this.normalizeAll(
        externalItems
      );


    const externalMap =
      new Map();


    normalized.forEach(

      post => {

        externalMap.set(
          post.externalId,
          post
        );

      }

    );


    const updated =
      current.map(

        post => {

          if (
            post.externalId &&
            externalMap.has(
              post.externalId
            )
          ) {

            const latest =
              externalMap.get(
                post.externalId
              );


            externalMap.delete(
              post.externalId
            );


            return {

              ...post,

              ...latest,

              id:
                post.id

            };

          }


          return post;

        }

      );


    return [

      ...Array.from(
        externalMap.values()
      ),

      ...updated

    ];

  }

};