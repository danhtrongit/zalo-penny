import { Request, Response, NextFunction, RequestHandler } from "express";

type AnyRequest = Request & { userId?: string; userRole?: string };

type AsyncFn = (
  req: AnyRequest,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

export const asyncHandler = (fn: AsyncFn): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as AnyRequest, res, next)).catch(next);
  };
};
