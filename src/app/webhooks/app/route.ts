import { NextResponse } from "next/server";
import { verifySignature, ingestEvent, eventSchema } from "@/lib/webhook";
import { readBody, HttpError, rateLimit } from "@/lib/auth";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    verifySignature(
      body,
      request.headers.get("x-tpo-timestamp"),
      request.headers.get("x-tpo-signature"),
      process.env.WEBHOOK_SECRET,
    );
    await rateLimit("webhook-authenticated", 300);
    const input = eventSchema.parse(JSON.parse(body));
    const test =
      typeof input.event_id === "string" && input.event_id.startsWith("test_");
    if (
      test &&
      (!input.event_id?.startsWith("test_") ||
        !input.device_id?.startsWith("test_") ||
        (input.user_id && !input.user_id.startsWith("test_")))
    )
      throw new HttpError(400, "Test events require test_ identifiers");
    const result = await ingestEvent(input, test);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid app event" }, { status: 400 });
    console.error(
      "Webhook processing failed",
      e instanceof Error ? e.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Event could not be processed" },
      { status: 500 },
    );
  }
}
