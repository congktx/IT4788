import { Request } from "express";

export type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    userId?: number;
    sub?: number;
  };
};