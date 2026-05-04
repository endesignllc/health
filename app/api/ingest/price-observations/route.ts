import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ingestPriceObservations,
  ingestRowSchema,
} from "@/lib/ingest-price-observations";

const bodySchema = z.union([
  z.array(ingestRowSchema),
  z.object({
    observations: z.array(ingestRowSchema),
    recomputeStats: z.boolean().optional(),
  }),
]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret =
    process.env.PRICE_INGEST_SECRET ?? process.env.ADMIN_TOKEN ?? "";
  if (!secret) {
    return NextResponse.json(
      { error: "PRICE_INGEST_SECRET (or ADMIN_TOKEN) is not configured" },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!bearer || bearer !== secret) {
    return unauthorized();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const rows = Array.isArray(data) ? data : data.observations;
  const recomputeStats = Array.isArray(data) ? true : (data.recomputeStats ?? true);

  try {
    const result = await ingestPriceObservations(rows, {
      recomputeStats,
    });
    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      skipped: result.skipped,
      unknownSlugs: result.unknownSlugs,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Insert failed" },
      { status: 500 }
    );
  }
}
