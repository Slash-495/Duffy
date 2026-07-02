/**
 * Spaced Repetition System (SRS) Service based on the SM-2 algorithm.
 * 
 * Grades:
 * 0: Complete blackout / Again
 * 1: Incorrect, but remembered the correct answer after seeing it
 * 2: Incorrect, but the correct answer seemed easy to recall
 * 3: Correct, but required significant effort / Hard
 * 4: Correct, after some hesitation / Good
 * 5: Perfect response / Easy
 * 
 * We simplify this to 4 buttons for the UI: Again (0), Hard (3), Good (4), Easy (5).
 */

export const calculateNextReview = (quality, currentEaseFactor, currentInterval, reviewCount) => {
  let newEaseFactor = currentEaseFactor;
  let newInterval = currentInterval;

  // 1. Calculate new Ease Factor
  // EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))
  newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // 2. Calculate new Interval
  if (quality < 3) {
    // User failed the card
    newInterval = 0; 
  } else {
    // User passed the card
    if (reviewCount === 0 || currentInterval === 0) {
      newInterval = 1;
    } else if (reviewCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  // 3. Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    nextReviewDate,
  };
};
