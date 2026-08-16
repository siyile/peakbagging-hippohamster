// Side-effect module: loads .env.local into process.env.
//
// Import this FIRST, before any module that reads env at import time —
// src/lib/r2.ts builds its S3Client at module scope, and ESM evaluates every
// import before the importing module's own statements run. A plain
// `config({...})` call in a script body therefore executes too late and the
// client comes up with undefined credentials ("Resolved credential object is
// not valid"). Keeping it in its own module makes the ordering explicit.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
