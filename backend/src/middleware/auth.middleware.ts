import type { RequestHandler } from "express";
import "../types/express.types";
import { ApiError } from "../utils/ApiError";
import { verifyToken } from "../utils/jwt";

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return next(ApiError.unauthorized("Missing token"));
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
};
