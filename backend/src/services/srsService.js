/**
 * Spaced Repetition System (SRS) Service based on standard SM-2 algorithm.
 *
 * Grades (quality):
 * 0: Complete blackout / Again
 * 1: Incorrect; remembered after seeing answer
 * 2: Incorrect; where correct response seemed easy to recall
 * 3: Correct response recalled with serious difficulty / Hard
 * 4: Correct response after hesitation / Good
 * 5: Perfect response / Easy
 *
 * Standard SM-2 behavior:
 * - quality < 3 (failure):
 *     repetitions = 0
 *     interval = 1 day
 *     easeFactor = unchanged
 * - quality >= 3 (success):
 *     easeFactor = max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
 *     interval = 1 for repetitions = 0 (first success)
 *     interval = 6 for repetitions = 1 (second success)
 *     interval = round(currentInterval * easeFactor) for repetitions >= 2
 *     repetitions = repetitions + 1
 *
 * Pure function accepting an optional "now" Date parameter for deterministic testing.
 */

export const calculateNextReview = (
  quality,
  currentEaseFactor = 2.5,
  currentInterval = 0,
  repetitions = 0,
  now = new Date()
) => {
  const baseDate = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  const q = Number(quality);
  const ef =
    typeof currentEaseFactor === "number" && !Number.isNaN(currentEaseFactor)
      ? currentEaseFactor
      : 2.5;
  const interval =
    typeof currentInterval === "number" && !Number.isNaN(currentInterval)
      ? currentInterval
      : 0;
  const reps =
    typeof repetitions === "number" && !Number.isNaN(repetitions)
      ? repetitions
      : 0;

  let newEaseFactor;
  let newInterval;
  let newRepetitions;

  if (q < 3) {
    // Card failed: reset repetitions count to 0, interval = 1, ease factor UNCHANGED
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = ef;
  } else {
    // Card passed: update ease factor with standard formula (floor 1.3)
    const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    newEaseFactor = Math.round((ef + delta) * 100) / 100;
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }

    // Interval progression: 1 for first success, 6 for second, then round(interval * EF)
    if (reps === 0) {
      newInterval = 1;
    } else if (reps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }

    newRepetitions = reps + 1;
  }

  const nextReviewDate = new Date(baseDate.getTime());
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
};
