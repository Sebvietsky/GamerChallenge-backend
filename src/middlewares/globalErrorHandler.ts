import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { HttpClientError } from "../lib/errors.ts";
import z from "zod";

export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if ("type" in error && error.type === "entity.parse.failed") {
    return res.status(400).json({ status: 400, error: "Invalid JSON body" });
  }

  if (error instanceof z.ZodError) {
    console.info("ZodError", error);

    return res.status(400).json({
      status: 400,
      error: z.prettifyError(error),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return res.status(404).json({ status: 404, error: "Resource not found" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ status: 409, error: "Resource already exists" });
    }

    if (error.code === "P2003") {
      return res
        .status(409)
        .json({ status: 409, error: "Operation rejected due to existing linked data" });
    }
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
