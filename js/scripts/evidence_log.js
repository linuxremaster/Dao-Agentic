#!/usr/bin/env node
import fs from "node:fs";
import { verifyEvidenceChain } from "../core/evidence_log.js";

function die(message, code = 2) { console.error(message); process.exit(code); }
const [command, file] = process.argv.slice(2);
if (command !== "verify" || !file) die("usage: evidence_log.js verify FILE");

try {
  const entries = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse)
    : [];
  console.log(JSON.stringify(verifyEvidenceChain(entries)));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  process.exitCode = 3;
}
