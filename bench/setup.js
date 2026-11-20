import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, "..");
export const backendDir = path.resolve(rootDir, "backend");

export const requireFromBackend = createRequire(path.join(backendDir, "package.json"));

export function toFileUrl(p) {
  return pathToFileURL(p).href;
}

export function getRedisUrl() {
  if (process.env.BENCH_REDIS_URL) {
    return process.env.BENCH_REDIS_URL;
  }
  let host = "127.0.0.1";
  try {
    const wslIp = execSync("wsl hostname -I", { encoding: "utf8" }).trim().split(/\s+/)[0];
    if (wslIp) host = wslIp;
  } catch {}
  return `redis://${host}:6379`;
}

export function initBenchEnv() {
  const redisUrl = getRedisUrl();
  process.env.REDIS_URL = redisUrl;
  process.env.REDIS_ENABLED = "true";
  process.env.NODE_ENV = "test";
  return { redisUrl };
}

export async function startMongo() {
  const { MongoMemoryServer } = await import(toFileUrl(path.join(backendDir, "node_modules/mongodb-memory-server/index.js")));
  const mongoose = (await import(toFileUrl(path.join(backendDir, "node_modules/mongoose/index.js")))).default;
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  return { mongod, mongoose };
}

export async function stopMongo(mongod, mongoose) {
  if (mongoose) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}
