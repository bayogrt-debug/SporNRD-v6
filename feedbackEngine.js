import { ACTION_WEIGHT } from "./defaultWeights.js";
import { readLearningState, writeLearningState } from "./learningStore.js";

export async function recordFeedback(env, payload) {
  const action = String(payload?.action || "");
  const category = String(payload?.category || "announcement");
  const source = String(payload?.source || "unknown");
  const delta = ACTION_WEIGHT[action] || 0;

  const state = await readLearningState(env);

  state.categoryBoosts[category] = clamp(
    Number(state.categoryBoosts[category] || 0) + delta * 0.08,
    -4,
    8
  );

  state.sourceBoosts[source] = clamp(
    Number(state.sourceBoosts[source] || 0) + delta * 0.03,
    -3,
    5
  );

  state.actionCounts[action] = Number(state.actionCounts[action] || 0) + 1;
  state.totalSignals = Number(state.totalSignals || 0) + 1;
  state.updatedAt = new Date().toISOString();

  const persisted = await writeLearningState(env, state);

  return {
    persisted,
    state
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
