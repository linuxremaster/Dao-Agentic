import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { extractEpistemicTrace } from "../core/epistemic_trace.js";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

export const relayPublishAdapter = Object.freeze({
  id: "relay-publish-v1",
  action: "RELAY_PUBLISH",
  execution_contract: Object.freeze(["QUERYABLE", "NON_RETRYABLE"]),

  derive({ input, evidenceIds = [] }) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("relay input must be an object");
    const source = explicit(input.source, "input.source");
    const messageId = explicit(input.message_id, "input.message_id");
    const outbox = process.env.DAO_RELAY_OUTBOX;
    if (!outbox || !path.isAbsolute(outbox)) {
      throw new TypeError("DAO_RELAY_OUTBOX must be an absolute deployment-controlled path");
    }

    const bytes = fs.readFileSync(source);
    const digest = sha256(bytes);
    const text = bytes.toString("utf8");
    const declared = text.split(/\r?\n/).find((line) => line.startsWith("message_id:"));
    if (!declared || declared.slice("message_id:".length).trim() !== messageId) {
      throw new TypeError("source message_id does not match input.message_id");
    }
    const epistemicTrace = extractEpistemicTrace(text, { messageId });
    const epistemicDigest = sha256(Buffer.from(JSON.stringify(epistemicTrace), "utf8"));

    return Object.freeze({
      target: `${messageId}@sha256:${digest}`,
      scope: "dao-agentic-relay/outbox",
      evidence_ids: Object.freeze([...new Set([
        ...evidenceIds,
        `content-sha256:${digest}`,
        `epistemic-trace-sha256:${epistemicDigest}`,
        `epistemic-claims:${epistemicTrace.claims.length}`,
        `epistemic-sources:${epistemicTrace.sources.length}`,
      ])]),
      execution_input: Object.freeze({
        source,
        message_id: messageId,
        digest,
        epistemic_trace: epistemicTrace,
        epistemic_trace_sha256: epistemicDigest,
        outbox,
      }),
    });
  },

  async execute({ executionInput }) {
    const destination = path.join(executionInput.outbox, path.basename(executionInput.source));
    fs.mkdirSync(executionInput.outbox, { recursive: true });
    fs.copyFileSync(executionInput.source, destination, fs.constants.COPYFILE_EXCL);
    const written = fs.readFileSync(destination);
    const writtenHash = sha256(written);
    if (writtenHash !== executionInput.digest) {
      try { fs.unlinkSync(destination); } catch {}
      throw new Error("published bytes failed integrity verification");
    }
    return Object.freeze({
      status: "PUBLISHED",
      message_id: executionInput.message_id,
      target: `${executionInput.message_id}@sha256:${executionInput.digest}`,
      destination: path.basename(destination),
      sha256: executionInput.digest,
      bytes: written.length,
      epistemic_trace_sha256: executionInput.epistemic_trace_sha256,
      epistemic_trace: executionInput.epistemic_trace,
    });
  },

  async reconcile({ executionInput }) {
    const destination = path.join(executionInput.outbox, path.basename(executionInput.source));
    if (!fs.existsSync(destination)) return Object.freeze({ status: "EFFECT_ABSENT" });
    const bytes = fs.readFileSync(destination);
    const digest = sha256(bytes);
    if (digest === executionInput.digest) {
      return Object.freeze({ status: "EFFECT_PRESENT", sha256: digest, bytes: bytes.length });
    }
    return Object.freeze({ status: "CONFLICT", observed_sha256: digest });
  },
});
