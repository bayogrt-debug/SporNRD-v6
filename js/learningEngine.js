(function () {
  const KEY = window.SPORNRD_CONFIG.learning.localStorageKey || "spornrd_learning_v2";

  const ACTION_WEIGHT = {
    wow: 3,
    save: 4,
    share: 5,
    detail: 2,
    source: 3,
    trash: -6,
    reaction: 1
  };

  const DEFAULT_MODEL = {
    categoryBoosts: {
      coach: 0,
      athlete: 0,
      event: 0,
      education: 0,
      announcement: 0
    },
    sourceBoosts: {},
    actionCounts: {},
    totalSignals: 0,
    updatedAt: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT_MODEL);
      const parsed = JSON.parse(raw);
      return {
        ...clone(DEFAULT_MODEL),
        ...parsed,
        categoryBoosts: {
          ...clone(DEFAULT_MODEL).categoryBoosts,
          ...(parsed.categoryBoosts || {})
        }
      };
    } catch {
      return clone(DEFAULT_MODEL);
    }
  }

  function save(model) {
    localStorage.setItem(KEY, JSON.stringify(model));
  }

  function learn(post, action) {
    const model = load();
    const delta = ACTION_WEIGHT[action] || 0;
    const category = post.category || "announcement";
    const source = post.source || "unknown";

    model.categoryBoosts[category] = clamp(
      (model.categoryBoosts[category] || 0) + delta * 0.12,
      -4,
      8
    );

    model.sourceBoosts[source] = clamp(
      (model.sourceBoosts[source] || 0) + delta * 0.05,
      -3,
      5
    );

    model.actionCounts[action] = (model.actionCounts[action] || 0) + 1;
    model.totalSignals += 1;
    model.updatedAt = new Date().toISOString();

    save(model);
    return model;
  }

  function score(post) {
    const model = load();
    const category = model.categoryBoosts[post.category] || 0;
    const source = model.sourceBoosts[post.source] || 0;
    const base = Number(post.finalScore || post.relevanceScore || 0);
    return base + category + source;
  }

  function rank(posts) {
    return [...posts].sort((a, b) => {
      const learned = score(b) - score(a);
      if (learned !== 0) return learned;
      return Number(b.timestamp || 0) - Number(a.timestamp || 0);
    });
  }

  function getState() {
    return load();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.SPORNRD_LEARNING = {
    learn,
    score,
    rank,
    getState,
    actionWeight: ACTION_WEIGHT
  };
})();
