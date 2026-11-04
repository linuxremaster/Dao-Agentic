#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function die(message, code = 2) { console.error(message); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (i + 1 >= argv.length) die(`missing value for --${key}`);
    out[key] = argv[++i];
  }
  return out;
}

function modeBits(stat) { return stat.mode & 0o777; }
function octal(mode) { return mode.toString(8).padStart(3, "0"); }
function writableByOther(mode) { return (mode & 0o022) !== 0; }

function walk(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (ent.name === ".git" || ent.name === "node_modules") continue;
    const p = path.join(root, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "check") {
  die("usage: deployment_guard.js check --repo-root DIR --state-dir DIR --trust-store FILE");
}
for (const key of ["repo-root", "state-dir", "trust-store"]) if (!a[key]) die(`--${key} is required`);

const findings = [];
const repoRoot = path.resolve(a["repo-root"]);
const stateDir = path.resolve(a["state-dir"]);
const trustStore = path.resolve(a["trust-store"]);

const privatePatterns = [
  /^operator-private\.pem$/i,
  /\.operator-private\.pem$/i,
  /\.private\.pem$/i,
];
for (const file of walk(repoRoot)) {
  if (privatePatterns.some((re) => re.test(path.basename(file)))) {
    findings.push({
      severity: "HOLD",
      code: "PRIVATE_KEY_INSIDE_RUNTIME_TREE",
      path: path.relative(repoRoot, file),
    });
  }
}

for (const p of [stateDir, trustStore]) {
  if (!fs.existsSync(p)) continue;
  const stat = fs.statSync(p);
  const mode = modeBits(stat);
  if (writableByOther(mode)) {
    findings.push({
      severity: "HOLD",
      code: "GROUP_OR_WORLD_WRITABLE",
      path: p,
      mode: octal(mode),
    });
  }
}

if (fs.existsSync(stateDir)) {
  for (const file of walk(stateDir)) {
    const stat = fs.statSync(file);
    const mode = modeBits(stat);
    if (writableByOther(mode)) {
      findings.push({
        severity: "HOLD",
        code: "STATE_FILE_GROUP_OR_WORLD_WRITABLE",
        path: file,
        mode: octal(mode),
      });
    }
  }
}

const holds = findings.filter((x) => x.severity === "HOLD");
const result = {
  disposition: holds.length ? "HOLD" : "PASS_WITH_DEPLOYMENT_BOUNDARY",
  findings,
  boundary: "This preflight detects local key placement and weak POSIX permissions; it does not prove separate-OS-user containment or immutable storage.",
};
console.log(JSON.stringify(result));
if (holds.length) process.exitCode = 3;
