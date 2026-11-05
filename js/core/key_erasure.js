function bool(value, name) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}
function nonnegativeInt(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative safe integer`);
  return value;
}
function validatePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new TypeError("paths must be a non-empty array");
  const ids = new Set();
  return paths.map((path, i) => {
    if (!path || typeof path !== "object" || Array.isArray(path)) throw new TypeError(`paths[${i}] must be an object`);
    if (typeof path.id !== "string" || path.id.trim() === "") throw new TypeError(`paths[${i}].id must be non-empty`);
    if (ids.has(path.id)) throw new TypeError(`duplicate key recovery path id: ${path.id}`);
    ids.add(path.id);
    bool(path.recoverable, `paths[${i}].recoverable`);
    return Object.freeze({ id: path.id, recoverable: path.recoverable });
  });
}

/**
 * Verify the bounded cryptographic-erasure claim against the policy-known
 * recovery-path graph. This establishes closure of authorized recovery paths;
 * it deliberately does not claim that unknown exfiltrated copies are impossible.
 */
export function evaluateErasure({
  paths,
  unresolvedPaths = 0,
  priorPlaintextOrKeyCompromise = false,
} = {}) {
  const checked = validatePaths(paths);
  nonnegativeInt(unresolvedPaths, "unresolvedPaths");
  bool(priorPlaintextOrKeyCompromise, "priorPlaintextOrKeyCompromise");

  const recoverable = checked.filter((p) => p.recoverable).map((p) => p.id);
  let overall;
  if (priorPlaintextOrKeyCompromise) {
    overall = "ERASURE_LIMITED_BY_PRIOR_COMPROMISE";
  } else if (recoverable.length > 0 || unresolvedPaths > 0) {
    overall = "ERASURE_INCOMPLETE";
  } else {
    overall = "VERIFIED_NO_AUTHORIZED_RECOVERY_PATH";
  }

  return Object.freeze({
    overall_erasure_state: overall,
    recoverable_path_ids: Object.freeze(recoverable),
    unresolved_path_count: unresolvedPaths,
    prior_compromise_status: priorPlaintextOrKeyCompromise ? "PRIOR_COMPROMISE" : "NONE_RECORDED",
    claim_scope: "POLICY_KNOWN_AUTHORIZED_RECOVERY_PATHS",
  });
}

/** Restore gate: tombstone/key-erasure state must be applied before ordinary
 * restoration makes protected objects or old wrappers usable. */
export function evaluateRestore({
  backupContainsOldWrapper = false,
  authoritativeTombstone = false,
  restoreOrder = [],
} = {}) {
  bool(backupContainsOldWrapper, "backupContainsOldWrapper");
  bool(authoritativeTombstone, "authoritativeTombstone");
  if (!Array.isArray(restoreOrder) || restoreOrder.some((x) => typeof x !== "string" || x.trim() === "")) {
    throw new TypeError("restoreOrder must be a list of non-empty strings");
  }

  const tombstoneIndex = restoreOrder.indexOf("tombstone");
  const objectsIndex = restoreOrder.indexOf("objects");
  const tombstoneAppliedFirst = authoritativeTombstone
    && tombstoneIndex >= 0
    && (objectsIndex < 0 || tombstoneIndex < objectsIndex);

  const restoredKeyRecoverable = backupContainsOldWrapper && !tombstoneAppliedFirst;
  return Object.freeze({
    restored_key_recoverable: restoredKeyRecoverable,
    restore_state: restoredKeyRecoverable ? "KEY_RESURRECTION_RISK" : "TOMBSTONE_ENFORCED",
  });
}
