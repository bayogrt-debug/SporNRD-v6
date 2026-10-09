export const DEFAULT_LEARNING_STATE = {
  version: 1,
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

export const ACTION_WEIGHT = {
  wow: 3,
  save: 4,
  share: 5,
  detail: 2,
  source: 3,
  trash: -6,
  reaction: 1
};
