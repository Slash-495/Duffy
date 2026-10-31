const isTest = () => process.env.NODE_ENV === "test";

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  if (typeof message === "object" && message !== null) {
    return JSON.stringify({ timestamp, level, ...message, ...meta });
  }
  const payload = { timestamp, level, message };
  if (meta && Object.keys(meta).length > 0) {
    if (meta instanceof Error) {
      payload.error = meta.message;
      payload.stack = meta.stack;
    } else {
      Object.assign(payload, meta);
    }
  }
  return JSON.stringify(payload);
}

export const logger = {
  info: (message, meta) => {
    if (isTest()) return;
    console.info(formatLog("info", message, meta));
  },
  warn: (message, meta) => {
    if (isTest()) return;
    console.warn(formatLog("warn", message, meta));
  },
  error: (message, meta) => {
    if (isTest()) return;
    console.error(formatLog("error", message, meta));
  },
};

export default logger;
