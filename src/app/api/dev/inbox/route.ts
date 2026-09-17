import { NextResponse } from "next/server";
import { getOutbox } from "@/lib/mailer";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }
  return NextResponse.json({ mails: getOutbox() });
}
