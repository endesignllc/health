import { config } from "dotenv";
config({ path: ".env.local" });

import { computeAndPersistProductClassStats } from "../lib/product-class-stats";

async function main() {
  console.log("Computing product class price stats from observations…");
  await computeAndPersistProductClassStats();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
