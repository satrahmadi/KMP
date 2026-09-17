import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function zodMessage(err: ZodError) {
  return err.issues[0]?.message ?? "Data tidak valid";
}
