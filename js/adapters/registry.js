import { relayPublishAdapter } from "./relay_publish.js";
import { githubMergeAdapter } from "./github_merge.js";

const ADAPTERS = new Map([
  [relayPublishAdapter.id, relayPublishAdapter],
  [githubMergeAdapter.id, githubMergeAdapter],
]);

export function getTrustedAdapter(id) {
  if (typeof id !== "string" || id.trim() === "") throw new TypeError("adapter id must be a non-empty string");
  const adapter = ADAPTERS.get(id);
  if (!adapter) throw new TypeError(`unregistered action adapter: ${id}`);
  return adapter;
}

export function listTrustedAdapters() {
  return Object.freeze([...ADAPTERS.keys()].sort());
}
