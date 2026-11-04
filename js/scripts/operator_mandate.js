#!/usr/bin/env node
import fs from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { signMandate } from "../core/mandates.js";

function die(message) { console.error(message); process.exit(2); }
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const k = a.slice(2); if (i + 1 >= argv.length) die(`missing value for --${k}`);
    out[k] = argv[++i];
  }
  return out;
}
const a = args(process.argv.slice(2));
const cmd = a._[0];
if (cmd === "keygen") {
  if (!a.kid || !a.private || !a.public || !a["trust-store"]) die("keygen requires --kid --private --public --trust-store");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  fs.writeFileSync(a.private, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600, flag: "wx" });
  fs.writeFileSync(a.public, publicKey.export({ type: "spki", format: "pem" }), { mode: 0o644, flag: "wx" });
  const trust = { version: "0.1", keys: [{ kid: a.kid, alg: "EdDSA", status: "ACTIVE", public_key_pem: fs.readFileSync(a.public, "utf8") }] };
  fs.writeFileSync(a["trust-store"], JSON.stringify(trust, null, 2) + "\n", { mode: 0o644, flag: "wx" });
  console.log(JSON.stringify({ created: true, kid: a.kid, private_key: a.private, public_key: a.public, trust_store: a["trust-store"] }));
} else if (cmd === "sign") {
  if (!a.kid || !a.private || !a.mandate || !a.out) die("sign requires --kid --private --mandate --out");
  const mandate = JSON.parse(fs.readFileSync(a.mandate, "utf8"));
  const jws = signMandate(mandate, { kid: a.kid, privateKeyPem: fs.readFileSync(a.private, "utf8") });
  fs.writeFileSync(a.out, jws + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ signed: true, mandate_id: mandate.mandate_id, output: a.out }));
} else {
  die("usage: operator_mandate.js keygen|sign ...");
}
