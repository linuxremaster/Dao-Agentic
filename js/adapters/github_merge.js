function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}
function positiveInteger(value, name) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError(`${name} must be a positive integer`);
  return n;
}
function sha(value, name) {
  explicit(value, name);
  if (!/^[0-9a-f]{40}$/.test(value)) throw new TypeError(`${name} must be a lowercase 40-hex git SHA`);
  return value;
}
function repository() {
  const repo = process.env.DAO_GITHUB_REPOSITORY;
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new TypeError("DAO_GITHUB_REPOSITORY must be deployment-controlled owner/repo");
  }
  return repo;
}
function apiBase() {
  const base = process.env.DAO_GITHUB_API_BASE || "https://api.github.com";
  let url;
  try { url = new URL(base); } catch { throw new TypeError("DAO_GITHUB_API_BASE is invalid"); }
  if (url.protocol !== "https:" && !(process.env.DAO_ALLOW_TEST_PROVIDER_ENDPOINT === "1" && url.protocol === "http:")) {
    throw new TypeError("GitHub API base must use HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}
function token() {
  const value = process.env.DAO_GITHUB_TOKEN;
  if (!value) throw new TypeError("DAO_GITHUB_TOKEN is required by deployment");
  return value;
}
function mergeMethod() {
  const value = process.env.DAO_GITHUB_MERGE_METHOD || "merge";
  if (!new Set(["merge", "squash", "rebase"]).has(value)) throw new TypeError("DAO_GITHUB_MERGE_METHOD is invalid");
  return value;
}
async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "dao-agentic-authorized-github-merge/0.1",
      ...(options.headers || {}),
    },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const message = body?.message || `GitHub API HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export const githubMergeAdapter = Object.freeze({
  id: "github-merge-v1",
  action: "MERGE",
  execution_contract: Object.freeze(["QUERYABLE", "NON_RETRYABLE"]),

  derive({ input, evidenceIds = [] }) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("GitHub merge input must be an object");
    const prNumber = positiveInteger(input.pr_number, "input.pr_number");
    const expectedHeadSha = sha(input.expected_head_sha, "input.expected_head_sha");
    const repo = repository();
    return Object.freeze({
      target: `PR-${prNumber}@${expectedHeadSha}`,
      scope: repo,
      evidence_ids: Object.freeze([...new Set(evidenceIds)]),
      execution_input: Object.freeze({
        repository: repo,
        pr_number: prNumber,
        expected_head_sha: expectedHeadSha,
        api_base: apiBase(),
        merge_method: mergeMethod(),
      }),
    });
  },

  async execute({ executionInput }) {
    const { repository: repo, pr_number: prNumber, expected_head_sha: expectedHeadSha, api_base: base, merge_method: method } = executionInput;
    const prUrl = `${base}/repos/${repo}/pulls/${prNumber}`;
    const pr = await githubRequest(prUrl);
    if (pr?.state !== "open") { const e = new Error("pull request is not open"); e.effect_status = "NO_EFFECT"; throw e; }
    if (pr?.head?.sha !== expectedHeadSha) { const e = new Error("pull request head changed before merge"); e.effect_status = "NO_EFFECT"; throw e; }
    if (pr?.base?.repo?.full_name && pr.base.repo.full_name !== repo) { const e = new Error("pull request base repository mismatch"); e.effect_status = "NO_EFFECT"; throw e; }

    const merge = await githubRequest(`${prUrl}/merge`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: expectedHeadSha, merge_method: method }),
    });
    if (merge?.merged !== true) throw new Error(merge?.message || "GitHub did not merge pull request");

    return Object.freeze({
      status: "MERGED",
      repository: repo,
      pr_number: prNumber,
      expected_head_sha: expectedHeadSha,
      merge_method: method,
      provider_merge_sha: merge.sha ?? null,
      provider_message: merge.message ?? null,
    });
  },

  async reconcile({ executionInput }) {
    const { repository: repo, pr_number: prNumber, expected_head_sha: expectedHeadSha, api_base: base } = executionInput;
    const pr = await githubRequest(`${base}/repos/${repo}/pulls/${prNumber}`);
    if (pr?.merged === true) {
      return Object.freeze({ status: "EFFECT_PRESENT", provider_merge_sha: pr.merge_commit_sha ?? null });
    }
    if (pr?.state === "open" && pr?.head?.sha === expectedHeadSha) {
      return Object.freeze({ status: "EFFECT_ABSENT" });
    }
    return Object.freeze({ status: "CONFLICT" });
  },
});
