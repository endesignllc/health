/**
 * Import price observations from a JSON file (array or { observations }) or NDJSON.
 * Usage:
 *   npx tsx scripts/import-price-observations.ts path/to/payload.json
 *   cat observations.ndjson | npx tsx scripts/import-price-observations.ts -
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import {
  ingestPriceObservations,
  ingestRowSchema,
} from "../lib/ingest-price-observations";
import { z } from "zod";

const arrayOrWrapper = z.union([
  z.array(ingestRowSchema),
  z.object({
    observations: z.array(ingestRowSchema),
    recomputeStats: z.boolean().optional(),
  }),
]);

function parseInput(raw: string): unknown {
  const t = raw.trim();
  if (!t) throw new Error("empty input");
  try {
    return JSON.parse(raw);
  } catch {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "Usage: npx tsx scripts/import-price-observations.ts <file.json|- for stdin>"
    );
    process.exit(1);
  }

  const raw =
    arg === "-" ? readFileSync(0, "utf-8") : readFileSync(arg, "utf-8");

  const parsed = parseInput(raw);
  const data = arrayOrWrapper.safeParse(parsed);
  if (!data.success) {
    console.error(z.treeifyError(data.error));
    process.exit(1);
  }

  const payload = data.data;
  const rows = Array.isArray(payload) ? payload : payload.observations;
  const recomputeStats = Array.isArray(payload)
    ? true
    : (payload.recomputeStats ?? true);

  const result = await ingestPriceObservations(rows, { recomputeStats });
  console.log(
    JSON.stringify(
      {
        inserted: result.inserted,
        skipped: result.skipped,
        unknownSlugs: result.unknownSlugs,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
