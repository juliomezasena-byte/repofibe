const DAY_MS = 24 * 60 * 60 * 1000;

export function getNodeMap(curriculum) {
  return new Map((curriculum?.nodes || []).map((node) => [node.scenarioId, node]));
}

export function isDue(progressEntry, now = Date.now()) {
  return Boolean(progressEntry?.nextReviewAt && progressEntry.nextReviewAt <= now);
}

export function hasCompleted(progressEntry) {
  return (progressEntry?.successfulAttempts || 0) > 0;
}

export function recordScenarioCompletion(progress, scenarioId, score, curriculum, now = Date.now()) {
  const node = getNodeMap(curriculum).get(scenarioId);
  const previous = progress[scenarioId] || { successfulAttempts: 0, completedDates: [] };
  const completedDates = Array.from(new Set([
    ...(previous.completedDates || []),
    new Date(now).toISOString().slice(0, 10)
  ]));
  const successfulAttempts = (previous.successfulAttempts || 0) + 1;
  const intervals = node?.reviewIntervals || [1, 3, 7, 14];
  const intervalDays = intervals[Math.min(successfulAttempts - 1, intervals.length - 1)] || 14;

  return {
    ...progress,
    [scenarioId]: {
      ...previous,
      successfulAttempts,
      completedDates,
      bestScore: Math.max(previous.bestScore || 0, score || 0),
      lastCompletedAt: now,
      nextReviewAt: now + intervalDays * DAY_MS,
      // Two sessions consolidate the skill; this is deliberately not called
      // mastery until the curriculum supports variable data per scenario.
      consolidated: completedDates.length >= 2
    }
  };
}

export function getDailyRecommendation(scenarios, curriculum, progress, now = Date.now()) {
  return getDailyPlan(scenarios, curriculum, progress, now).primaryScenarioId;
}

export function getDailyPlan(scenarios, curriculum, progress, now = Date.now()) {
  const nodes = [...(curriculum?.nodes || [])].sort((a, b) => a.order - b.order);
  const byId = new Map((scenarios || []).map((scenario) => [scenario.id, scenario]));
  const valid = nodes.filter((node) => byId.has(node.scenarioId));
  const ready = (node) => node.prerequisites.every((id) => hasCompleted(progress[id]));
  const due = valid
    .filter((node) => ready(node) && isDue(progress[node.scenarioId], now))
    .sort((a, b) => (progress[a.scenarioId].nextReviewAt || 0) - (progress[b.scenarioId].nextReviewAt || 0));
  const next = valid.find((node) => ready(node) && !hasCompleted(progress[node.scenarioId]));
  const firstAvailable = valid.find((node) => ready(node));
  const review = due[0]?.scenarioId || null;
  const newMission = next?.scenarioId || null;

  return {
    review,
    newMission,
    primaryScenarioId: review || newMission || firstAvailable?.scenarioId || valid[0]?.scenarioId || scenarios?.[0]?.id || null
  };
}

export function getProgressSummary(scenarios, progress) {
  const total = scenarios?.length || 0;
  const completed = (scenarios || []).filter((scenario) => hasCompleted(progress[scenario.id])).length;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}
