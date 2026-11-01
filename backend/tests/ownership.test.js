import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/server.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db.js";
import User from "../src/models/User.model.js";
import Deck from "../src/models/Deck.js";
import Flashcard from "../src/models/Flashcard.js";

async function createAuthUser(email, name = "Test User") {
  const user = await User.create({
    fullName: name,
    email,
    password: "password123",
  });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });
  return { user, token, cookie: `jwt=${token}` };
}

describe("Flashcards and Decks Ownership Isolation", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("prevents User B from reading, editing, or deleting User A's deck", async () => {
    const userA = await createAuthUser("usera@example.com", "User A");
    const userB = await createAuthUser("userb@example.com", "User B");

    // User A creates a deck
    const deckA = await Deck.create({
      userId: userA.user._id,
      name: "User A Secret Notes",
      description: "Private vocabulary",
    });

    // User B attempts to read User A's deck (GET)
    const readRes = await request(app)
      .get(`/api/decks/${deckA._id}`)
      .set("Cookie", [userB.cookie]);
    expect(readRes.status).toBe(404);
    expect(readRes.body.message).toMatch(/not found/i);

    // User B attempts to edit User A's deck (PUT)
    const editRes = await request(app)
      .put(`/api/decks/${deckA._id}`)
      .set("Cookie", [userB.cookie])
      .send({ name: "Hacked Deck Name" });
    expect(editRes.status).toBe(404);

    // Verify deck name in DB unchanged
    const unchangedDeck = await Deck.findById(deckA._id);
    expect(unchangedDeck.name).toBe("User A Secret Notes");

    // User B attempts to delete User A's deck (DELETE)
    const deleteRes = await request(app)
      .delete(`/api/decks/${deckA._id}`)
      .set("Cookie", [userB.cookie]);
    expect(deleteRes.status).toBe(404);

    // Verify deck still exists in DB
    const stillExistingDeck = await Deck.findById(deckA._id);
    expect(stillExistingDeck).not.toBeNull();
  });

  it("prevents User B from editing, deleting, or injecting cards into User A's deck", async () => {
    const userA = await createAuthUser("usera2@example.com", "User A2");
    const userB = await createAuthUser("userb2@example.com", "User B2");

    const deckA = await Deck.create({
      userId: userA.user._id,
      name: "User A Deck",
      description: "Cards deck",
    });

    const cardA = await Flashcard.create({
      userId: userA.user._id,
      deckId: deckA._id,
      word: "Bonjour",
      meaning: "Hello",
      language: "French",
    });

    // User B attempts to add a card to User A's deck (POST /api/flashcards)
    const injectRes = await request(app)
      .post("/api/flashcards")
      .set("Cookie", [userB.cookie])
      .send({
        deckId: deckA._id.toString(),
        word: "Injected Word",
        meaning: "Malicious injection",
        language: "French",
      });
    expect(injectRes.status).toBe(404);
    expect(injectRes.body.message).toMatch(/Deck not found/i);

    // User B attempts to edit User A's flashcard (PUT /api/flashcards/:id)
    const editCardRes = await request(app)
      .put(`/api/flashcards/${cardA._id}`)
      .set("Cookie", [userB.cookie])
      .send({ word: "Modified Word" });
    expect(editCardRes.status).toBe(404);
    expect(editCardRes.body.message).toMatch(/Flashcard not found/i);

    // Verify card in DB unchanged
    const unchangedCard = await Flashcard.findById(cardA._id);
    expect(unchangedCard.word).toBe("Bonjour");

    // User B attempts to delete User A's flashcard (DELETE /api/flashcards/:id)
    const deleteCardRes = await request(app)
      .delete(`/api/flashcards/${cardA._id}`)
      .set("Cookie", [userB.cookie]);
    expect(deleteCardRes.status).toBe(404);
    expect(deleteCardRes.body.message).toMatch(/Flashcard not found/i);

    // Verify card still exists
    const stillExistingCard = await Flashcard.findById(cardA._id);
    expect(stillExistingCard).not.toBeNull();
  });

  it("allows User A to view, edit, and delete their own deck and card", async () => {
    const userA = await createAuthUser("usera3@example.com", "User A3");

    // User A creates a deck
    const deckRes = await request(app)
      .post("/api/decks")
      .set("Cookie", [userA.cookie])
      .send({ name: "User A Deck 3", description: "Legitimate deck" });
    expect(deckRes.status).toBe(201);
    const deckId = deckRes.body._id;

    // User A creates a card
    const cardRes = await request(app)
      .post("/api/flashcards")
      .set("Cookie", [userA.cookie])
      .send({
        deckId,
        word: "Danke",
        meaning: "Thank you",
        language: "German",
      });
    expect(cardRes.status).toBe(201);
    const cardId = cardRes.body._id;

    // User A reads their deck
    const readRes = await request(app)
      .get(`/api/decks/${deckId}`)
      .set("Cookie", [userA.cookie]);
    expect(readRes.status).toBe(200);
    expect(readRes.body.deck._id).toBe(deckId);
    expect(readRes.body.cards).toHaveLength(1);

    // User A edits their card
    const editRes = await request(app)
      .put(`/api/flashcards/${cardId}`)
      .set("Cookie", [userA.cookie])
      .send({ meaning: "Thanks a lot" });
    expect(editRes.status).toBe(200);
    expect(editRes.body.meaning).toBe("Thanks a lot");

    // User A deletes their card
    const deleteRes = await request(app)
      .delete(`/api/flashcards/${cardId}`)
      .set("Cookie", [userA.cookie]);
    expect(deleteRes.status).toBe(200);

    // User A deletes their deck
    const deleteDeckRes = await request(app)
      .delete(`/api/decks/${deckId}`)
      .set("Cookie", [userA.cookie]);
    expect(deleteDeckRes.status).toBe(200);
  });
});
