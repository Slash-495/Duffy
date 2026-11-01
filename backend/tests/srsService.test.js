import { describe, it, expect } from "vitest";
import { calculateNextReview } from "../src/services/srsService.js";

describe("srsService - SM-2 calculateNextReview", () => {
  const fixedNow = new Date("2026-06-01T12:00:00.000Z");

  it("failing a card (quality < 3) resets repetitions to 0, sets interval to 1, and leaves ease factor unchanged", () => {
    // Quality 0 (complete blackout)
    const res0 = calculateNextReview(0, 2.3, 10, 4, fixedNow);
    expect(res0.repetitions).toBe(0);
    expect(res0.interval).toBe(1);
    expect(res0.easeFactor).toBe(2.3);
    const expectedDate0 = new Date(fixedNow.getTime());
    expectedDate0.setDate(expectedDate0.getDate() + 1);
    expect(res0.nextReviewDate.toISOString()).toBe(expectedDate0.toISOString());

    // Quality 2 (incorrect)
    const res2 = calculateNextReview(2, 1.85, 15, 3, fixedNow);
    expect(res2.repetitions).toBe(0);
    expect(res2.interval).toBe(1);
    expect(res2.easeFactor).toBe(1.85);
  });

  it("first success (quality >= 3, repetitions = 0) sets interval = 1, increments repetitions to 1, and updates EF", () => {
    // Quality 4 (good): delta = 0.1 - (1) * (0.08 + 0.02) = 0.1 - 0.1 = 0
    const res = calculateNextReview(4, 2.5, 0, 0, fixedNow);
    expect(res.repetitions).toBe(1);
    expect(res.interval).toBe(1);
    expect(res.easeFactor).toBe(2.5);

    // Quality 5 (easy): delta = 0.1 - 0 = +0.10 -> EF = 2.6
    const resEasy = calculateNextReview(5, 2.5, 0, 0, fixedNow);
    expect(resEasy.repetitions).toBe(1);
    expect(resEasy.interval).toBe(1);
    expect(resEasy.easeFactor).toBe(2.6);
  });

  it("second success (quality >= 3, repetitions = 1) sets interval = 6 and increments repetitions to 2", () => {
    const res = calculateNextReview(4, 2.5, 1, 1, fixedNow);
    expect(res.repetitions).toBe(2);
    expect(res.interval).toBe(6);
    expect(res.easeFactor).toBe(2.5);

    const expectedDate = new Date(fixedNow.getTime());
    expectedDate.setDate(expectedDate.getDate() + 6);
    expect(res.nextReviewDate.toISOString()).toBe(expectedDate.toISOString());
  });

  it("later success (quality >= 3, repetitions >= 2) scales interval by ease factor", () => {
    // Current interval = 6, EF = 2.5, quality = 4 -> new interval = round(6 * 2.5) = 15
    const res = calculateNextReview(4, 2.5, 6, 2, fixedNow);
    expect(res.repetitions).toBe(3);
    expect(res.interval).toBe(15);
    expect(res.easeFactor).toBe(2.5);

    // Next step: current interval = 15, EF = 2.5, quality = 4 -> round(15 * 2.5) = 38
    const resNext = calculateNextReview(4, 2.5, 15, 3, fixedNow);
    expect(resNext.repetitions).toBe(4);
    expect(resNext.interval).toBe(38);
  });

  it("enforces ease factor floor at 1.3 even with repeated difficult ratings", () => {
    let ef = 1.4;
    let interval = 6;
    let reps = 2;

    // Quality 3 reduces EF by 0.14
    for (let i = 0; i < 5; i++) {
      const result = calculateNextReview(3, ef, interval, reps, fixedNow);
      ef = result.easeFactor;
      interval = result.interval;
      reps = result.repetitions;
    }

    expect(ef).toBe(1.3);
  });

  it("uses current date if now is not provided", () => {
    const before = new Date();
    const res = calculateNextReview(4, 2.5, 0, 0);
    const after = new Date();

    expect(res.nextReviewDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(res.nextReviewDate.getTime()).toBeLessThanOrEqual(after.getTime() + 86400000 + 1000);
  });
});
