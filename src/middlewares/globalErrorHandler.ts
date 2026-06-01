import type { NextFunction, Request, Response } from "express";
import { HttpClientError } from "../lib/errors.ts";
import z from "zod";

export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof z.ZodError) {
    console.info("ZodError", error);

    return res.status(400).json({
      status: 400,
      error: z.prettifyError(error),
    });
  }

  if (error instanceof HttpClientError) {
    return res.status(error.status).json({
      status: error.status,
      error: error.message,
    });
  }

  res.status(500).json({
    status: 500,
    error: "Internal server error",
  });
}
