import { DEFAULT_LEARNING_STATE } from "./defaultWeights.js";

const KEY = "global-learning-v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function readLearningState(env) {
  if (!env?.SPORNRD_LEARNING?.get) {
    return clone(DEFAULT_LEARNING_STATE);
  }

  try {
    const stored = await env.SPORNRD_LEARNING.get(KEY, "json");
    return stored
      ? {
          ...clone(DEFAULT_LEARNING_STATE),
          ...stored,
          categoryBoosts: {
            ...clone(DEFAULT_LEARNING_STATE).categoryBoosts,
            ...(stored.categoryBoosts || {})
          }
        }
      : clone(DEFAULT_LEARNING_STATE);
  } catch {
    return clone(DEFAULT_LEARNING_STATE);
  }
}

export async function writeLearningState(env, state) {
  if (!env?.SPORNRD_LEARNING?.put) return false;

  try {
    await env.SPORNRD_LEARNING.put(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
