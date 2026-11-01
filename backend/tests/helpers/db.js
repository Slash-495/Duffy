import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod = null;

export async function connectTestDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!mongod) {
    mongod = await MongoMemoryServer.create();
  }
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

export async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
