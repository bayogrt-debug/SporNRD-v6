export function calculateFinalScore(article, learningState) {
  const base = Number(article.relevanceScore || 0) * 10;
  const urgency = article.urgency === "high" ? 12 : article.urgency === "medium" ? 6 : 0;
  const action = article.actionRequired ? 5 : 0;
  const quality = Number(article.qualityScore || 0) * 0.2;
  const categoryBoost = Number(learningState?.categoryBoosts?.[article.category] || 0);
  const sourceBoost = Number(learningState?.sourceBoosts?.[article.source] || 0);

  return Math.round((base + urgency + action + quality + categoryBoost + sourceBoost) * 100) / 100;
}
