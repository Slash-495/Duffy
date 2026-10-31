import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      const candidate = req.headers.authorization.split(" ")[1];
      if (candidate && candidate !== "null" && candidate !== "undefined") {
        token = candidate;
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - Invalid or expired token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized - User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Restricts route access to users whose User.role is in allowedRoles.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden - Requires role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
};
