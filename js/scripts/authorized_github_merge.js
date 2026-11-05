#!/usr/bin/env node
import { requestActionGateway } from "../core/action_gateway_client.js";

function die(message, code = 2) { console.error(message); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [], evidence: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (i + 1 >= argv.length) die(`missing value for --${key}`);
    const value = argv[++i];
    if (key === "evidence") out.evidence.push(value);
    else out[key] = value;
  }
  return out;
}

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "merge") {
  die("usage: authorized_github_merge.js merge --gateway-socket FILE --pr-number N --expected-head-sha SHA --subject ID --event-id ID --request-id ID [--evidence ID]");
}
for (const key of ["gateway-socket", "pr-number", "expected-head-sha", "subject", "event-id", "request-id"]) {
  if (!a[key]) die(`--${key} is required`);
}

try {
  const response = await requestActionGateway({
    socketPath: a["gateway-socket"],
    request: {
      adapter_id: "github-merge-v1",
      subject: a.subject,
      request_id: a["request-id"],
      input: { pr_number: a["pr-number"], expected_head_sha: a["expected-head-sha"] },
      evidence_ids: a.evidence,
      decision_event_id: a["event-id"],
    },
  });
  console.log(JSON.stringify(response));
  if (response.enforcement !== "ALLOW") process.exitCode = 3;
} catch (err) {
  console.error(JSON.stringify({ enforcement: "ERROR", error: String(err?.message || err) }));
  process.exitCode = 4;
}
