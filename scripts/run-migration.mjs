import { readFileSync } from "fs";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <migration.sql>");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const content = readFileSync(file, "utf-8");
const statements = content
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Running ${statements.length} statement(s) from ${file}`);
for (let i = 0; i < statements.length; i++) {
  const preview = statements[i].split("\n")[0].slice(0, 80);
  console.log(`  [${i + 1}/${statements.length}] ${preview}...`);
}

try {
  await sql.transaction(statements.map((s) => sql.query(s)));
  console.log("\nMigration applied successfully.");
} catch (e) {
  console.error("\nMigration failed:", e.message || e);
  process.exit(1);
}
