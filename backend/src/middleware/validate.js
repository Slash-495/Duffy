import mongoose from "mongoose";
import { AppError } from "../lib/AppError.js";

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

export const validateObjectIdParam =
  (paramName = "id") =>
  (req, res, next) => {
    const val = req.params?.[paramName];
    if (!val || !mongoose.Types.ObjectId.isValid(val)) {
      return next(new AppError(`Invalid ${paramName} parameter`, 400));
    }
    next();
  };
