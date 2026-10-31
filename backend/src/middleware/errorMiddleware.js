export const errorHandler = (err, req, res, next) => {
  let statusCode =
    err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Internal Server Error";
  let validationErrors = undefined;

  // Zod request validation errors
  if (err.name === "ZodError" && Array.isArray(err.issues)) {
    statusCode = 400;
    validationErrors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    message = validationErrors[0]?.message || "Invalid request payload";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path || "resource"} ID format`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const dupField = Object.keys(err.keyPattern || {})[0] || "field";
    message = `Duplicate value for ${dupField}`;
  } else if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Unauthorized - Invalid or expired token";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request payload exceeds the maximum allowed size";
  }

  if (statusCode >= 500) {
    console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}: ${err.message}`);
  }

  const payload = {
    success: false,
    message,
  };

  if (validationErrors) {
    payload.errors = validationErrors;
  }

  if (process.env.NODE_ENV !== "production" && statusCode >= 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
