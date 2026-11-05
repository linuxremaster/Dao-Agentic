#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function die(message, code = 2) { console.error(message); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [], "forbidden-env": [], "forbidden-write-path": [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (i + 1 >= argv.length) die(`missing value for --${key}`);
    const value = argv[++i];
    if (key === "forbidden-env" || key === "forbidden-write-path") out[key].push(value);
    else out[key] = value;
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

function writable(pathname) {
  try { fs.accessSync(pathname, fs.constants.W_OK); return true; }
  catch { return false; }
}

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "check") {
  die("usage: deployment_guard.js check --repo-root DIR --state-dir DIR --trust-store FILE [--runtime-role agent|gateway] [--forbidden-env NAME] [--forbidden-write-path PATH]");
}
for (const key of ["repo-root", "state-dir", "trust-store"]) if (!a[key]) die(`--${key} is required`);
if (a["runtime-role"] && !new Set(["agent", "gateway"]).has(a["runtime-role"])) die("--runtime-role must be agent or gateway");

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

if (a["runtime-role"] === "agent") {
  const forbiddenEnv = new Set(["DAO_GITHUB_TOKEN", "DAO_RELAY_OUTBOX", ...a["forbidden-env"]]);
  for (const name of [...forbiddenEnv].sort()) {
    if (process.env[name]) {
      findings.push({ severity: "HOLD", code: "MUTATION_CAPABILITY_EXPOSED_TO_AGENT", environment_variable: name });
    }
  }
  for (const raw of a["forbidden-write-path"]) {
    const p = path.resolve(raw);
    if (fs.existsSync(p) && writable(p)) {
      findings.push({ severity: "HOLD", code: "MUTATION_PATH_WRITABLE_BY_AGENT", path: p });
    }
  }
}

const holds = findings.filter((x) => x.severity === "HOLD");
const result = {
  disposition: holds.length ? "HOLD" : "PASS_WITH_DEPLOYMENT_BOUNDARY",
  runtime_role: a["runtime-role"] ?? "unspecified",
  findings,
  boundary: "This preflight detects local key placement, weak POSIX permissions, and configured agent-side mutation capabilities. Mandatory routing still requires credential/filesystem separation at the OS, app, container, or remote-service boundary.",
};
console.log(JSON.stringify(result));
if (holds.length) process.exitCode = 3;
