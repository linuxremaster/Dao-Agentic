"""Deterministic structural checker for the organ registry.

Pure core: check(registry) takes already-parsed JSON data (inert dicts/lists/
strings from json.load) and returns a sorted list of findings. No clock, no
randomness, no network. A clean result means the registry is structurally
consistent; it says nothing about whether any organ is correct or useful.

Usage: python3 scripts/organs/check_registry.py [path]   (exit 0 = no findings)
"""

import json
import sys
from pathlib import Path

DEFAULT = Path(__file__).resolve().parents[2] / "contracts/organs/organ_registry.json"
OFFLINE = "OFFLINE"
SUBSTRATE_PREFIX = "S"


def _ids(registry):
    subs = [s.get("substrate_id") for s in registry.get("substrates", [])]
    orgs = [o.get("organ_id") for o in registry.get("organs", [])]
    return subs, orgs


def _cycle(graph):
    state = {}

    def visit(node, path):
        state[node] = 1
        for dep in graph.get(node, ()):
            if state.get(dep) == 1:
                return path + [node, dep]
            if dep in graph and state.get(dep) is None:
                found = visit(dep, path + [node])
                if found:
                    return found
        state[node] = 2
        return None

    for node in sorted(graph):
        if state.get(node) is None:
            found = visit(node, [])
            if found:
                return found
    return None


def check(registry):
    findings = []

    def add(code, ident, message):
        findings.append((code, ident or "-", message))

    if type(registry) is not dict:
        return [("E00", "-", "registry must be a JSON object")]
    for key in ("registry_version", "status_vocabulary", "contract_fields", "substrates", "organs"):
        if key not in registry:
            add("E01", key, "missing top-level key")
    if findings:
        return sorted(findings)

    subs, orgs = _ids(registry)
    all_ids = subs + orgs
    for ident in sorted({i for i in all_ids if all_ids.count(i) > 1}):
        add("E02", ident, "duplicate id")

    vocab = set(registry["status_vocabulary"])
    access_vocab = set(registry.get("access_class_vocabulary", []))
    fields = registry["contract_fields"]
    by_id = {o.get("organ_id"): o for o in registry["organs"]}
    not_adopted = {i for i, o in by_id.items() if o.get("adoption") == "NOT_ADOPTED"}

    for s in registry["substrates"]:
        sid = s.get("substrate_id")
        if s.get("class") != "substrate" or not str(sid).startswith(SUBSTRATE_PREFIX):
            add("E08", sid, "substrate must have class 'substrate' and an S-prefixed id")
        if s.get("implementation_status") not in vocab:
            add("E04", sid, "implementation_status not in status_vocabulary")
        if s.get("implementation_status") == "REPRODUCED_EXECUTABLE" and not s.get("evidence_refs"):
            add("E10", sid, "REPRODUCED_EXECUTABLE requires evidence_refs")

    for o in registry["organs"]:
        oid = o.get("organ_id")
        for f in fields:
            value = o.get(f)
            if f not in o or value in (None, "", []) and f not in ("dependencies", "evidence_refs"):
                add("E03", oid, f"missing or empty contract field: {f}")
        if o.get("class") == "substrate" or str(oid).startswith(SUBSTRATE_PREFIX):
            add("E08", oid, "a substrate is listed as an ordinary organ")
        if o.get("implementation_status") not in vocab:
            add("E04", oid, "implementation_status not in status_vocabulary")
        if access_vocab and "access_class" in o and o["access_class"] not in access_vocab:
            add("E11", oid, "access_class not in access_class_vocabulary")
        if o.get("implementation_status") == "REPRODUCED_EXECUTABLE" and not o.get("evidence_refs"):
            add("E10", oid, "REPRODUCED_EXECUTABLE requires evidence_refs")
        for dep in o.get("dependencies", []):
            if dep not in all_ids:
                add("E05", oid, f"unresolved dependency: {dep}")
            if dep in not_adopted:
                add("E07", oid, f"depends on non-adopted organ: {dep}")

        stage = o.get("runtime_stage")
        if "runtime_stage" in o and stage != OFFLINE and type(stage) is not int:
            add("E09", oid, "runtime_stage must be an integer or OFFLINE")
        elif type(stage) is int:
            for dep in o.get("dependencies", []):
                target = by_id.get(dep)
                if target is None:
                    continue
                dstage = target.get("runtime_stage")
                if dstage == OFFLINE:
                    add("E09", oid, f"runtime organ depends on OFFLINE organ {dep}")
                elif type(dstage) is int and dstage > stage:
                    add("E09", oid, f"depends on {dep} which runs later (stage {dstage} > {stage})")

    graph = {o.get("organ_id"): list(o.get("dependencies", [])) for o in registry["organs"]}
    cycle = _cycle(graph)
    if cycle:
        add("E06", cycle[0], "dependency cycle: " + " -> ".join(cycle))

    return sorted(findings)


def main(argv):
    path = Path(argv[1]) if len(argv) > 1 else DEFAULT
    findings = check(json.loads(path.read_text(encoding="utf-8")))
    for code, ident, message in findings:
        print(f"{code} {ident}: {message}")
    print(f"{len(findings)} finding(s) in {path.name}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
