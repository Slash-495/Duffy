process.env.NODE_ENV = "test";
process.env.REDIS_ENABLED = "false";
process.env.JWT_SECRET_KEY = "test_super_secret_jwt_key_with_at_least_32_characters";
process.env.STREAM_API_KEY = "mock_stream_key";
process.env.STREAM_API_SECRET = "mock_stream_secret";
process.env.STREAM_APP_ID = "mock_stream_app_id";
process.env.GEMINI_API_KEY = "mock_gemini_key";
process.env.API_RATE_LIMIT_MAX = "10000";

import { vi } from "vitest";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn().mockResolvedValue({ id: "mock" }),
  generateStreamToken: vi.fn().mockReturnValue("mock_stream_token"),
}));

vi.mock("../src/services/ai/GeminiAdapter.js", () => {
  return {
    GeminiAdapter: class MockGeminiAdapter {
      async generateText() {
        return JSON.stringify({ corrections: [], score: 100 });
      }
      async *generateStream() {
        yield { text: "mock stream chunk" };
      }
    },
  };
});
