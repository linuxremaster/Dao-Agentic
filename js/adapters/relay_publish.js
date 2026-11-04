import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

export const relayPublishAdapter = Object.freeze({
  id: "relay-publish-v1",
  action: "RELAY_PUBLISH",

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
    const declared = bytes.toString("utf8").split(/\r?\n/).find((line) => line.startsWith("message_id:"));
    if (!declared || declared.slice("message_id:".length).trim() !== messageId) {
      throw new TypeError("source message_id does not match input.message_id");
    }

    return Object.freeze({
      target: `${messageId}@sha256:${digest}`,
      scope: "dao-agentic-relay/outbox",
      evidence_ids: Object.freeze([...new Set([...evidenceIds, `content-sha256:${digest}`])]),
      execution_input: Object.freeze({
        source,
        message_id: messageId,
        digest,
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
    });
  },
});
