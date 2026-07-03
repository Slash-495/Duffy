import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../lib/db.js";
import Lesson from "../models/Lesson.js";

dotenv.config();

const standardLessons = [
  {
    topic: "Present Simple vs Present Continuous",
    type: "grammar",
    level: "A1",
    isPreSeeded: true,
    content: {
      explanation: "Use the Present Simple for habits and routines. Use the Present Continuous for actions happening right now.",
      examples: [
        { original: "I eat an apple every day.", translation: "Habit (Present Simple)" },
        { original: "I am eating an apple right now.", translation: "Right now (Present Continuous)" }
      ]
    }
  },
  {
    topic: "Past Simple vs Past Continuous",
    type: "grammar",
    level: "A2",
    isPreSeeded: true,
    content: {
      explanation: "Use Past Simple for completed actions in the past. Use Past Continuous for actions that were in progress when something else happened.",
      examples: [
        { original: "I watched a movie last night.", translation: "Completed action" },
        { original: "I was watching a movie when the phone rang.", translation: "Interrupted action" }
      ]
    }
  },
  {
    topic: "Conditionals (Zero & First)",
    type: "grammar",
    level: "B1",
    isPreSeeded: true,
    content: {
      explanation: "Zero conditional for general truths (If + present, present). First conditional for real possibilities (If + present, will + infinitive).",
      examples: [
        { original: "If you heat ice, it melts.", translation: "General truth" },
        { original: "If it rains tomorrow, we will stay home.", translation: "Future possibility" }
      ]
    }
  }
];

const seedLessons = async () => {
  try {
    await connectDB();
    
    // Clear old seeded lessons
    await Lesson.deleteMany({ isPreSeeded: true });
    
    await Lesson.insertMany(standardLessons);
    console.log("Standard lessons seeded successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding lessons:", error);
    process.exit(1);
  }
};

seedLessons();
