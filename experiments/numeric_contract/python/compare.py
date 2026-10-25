"""Compare actual emissions; stdout is a reproducible evidence artifact."""

import json
import platform
import subprocess

from .emit import FIXTURES, ROOT, emit


def collect():
    python = emit()
    javascript = json.loads(subprocess.check_output(
        ["node", "experiments/numeric_contract/js/run.js"], cwd=ROOT, text=True))
    fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))["probes"]
    rows = []
    for fixture, py, js in zip(fixtures, python["observations"], javascript["observations"], strict=True):
        assert fixture["name"] == py["name"] == js["name"]
        comparisons = {}
        for name in ("baseline", "N", "J", "D"):
            left, right = py[name], js[name]
            if left["result"] == right["result"] == "ok":
                equal = (bytes.fromhex(left["canonical_hex"]) == bytes.fromhex(right["canonical_hex"])
                         and left["event_sha256"] == right["event_sha256"])
                comparisons[name] = "PASS" if equal else "HOLD"
            else:
                # Matching rejections do not establish byte or value equivalence.
                comparisons[name] = "HOLD"
        rows.append({**fixture, "python": py, "javascript": js, "byte_and_digest_identity": comparisons})
    return {"scope": "WO-003A; no candidate promoted; JCS_SUBSET_PROBE only",
            "runtimes": {"python": platform.python_version(), "node": subprocess.check_output(
                ["node", "--version"], text=True).strip()},
            "observations": rows,
            "replays": {"python": python["replays"], "javascript": javascript["replays"]}}


if __name__ == "__main__":
    print(json.dumps(collect(), ensure_ascii=True, indent=2, sort_keys=True))
