#!/usr/bin/env python3
"""Section 16 candidate: deterministic, non-destructive JSON projection.

Structural only: does not determine B, relevance, sufficiency, truth,
authorization, or source-deletion permission.
"""
import argparse, hashlib, json, os, sys, tempfile
from pathlib import Path

MISSING = object()

class ProjectionError(Exception): pass

def sha(b): return hashlib.sha256(b).hexdigest()

def tokens(ptr):
    if ptr == "": return []
    if not ptr.startswith("/"): raise ProjectionError(f"invalid JSON Pointer: {ptr!r}")
    out = []
    for raw in ptr[1:].split("/"):
        s, i = "", 0
        while i < len(raw):
            if raw[i] != "~": s += raw[i]; i += 1; continue
            if i + 1 >= len(raw) or raw[i+1] not in "01":
                raise ProjectionError(f"invalid JSON Pointer escape: {raw!r}")
            s += "~" if raw[i+1] == "0" else "/"; i += 2
        out.append(s)
    return out

def resolve(doc, ptr):
    cur = doc
    for t in tokens(ptr):
        if isinstance(cur, dict):
            if t not in cur: return MISSING
            cur = cur[t]
        elif isinstance(cur, list):
            valid_index = t == "0" or (
                bool(t)
                and t[0] in "123456789"
                and all("0" <= c <= "9" for c in t[1:])
            )
            if not valid_index:
                raise ProjectionError(f"invalid array index token: {t!r}")
            if int(t) >= len(cur): return MISSING
            cur = cur[int(t)]
        else: return MISSING
    return cur

def load(path):
    try: raw = path.read_bytes()
    except OSError as e: raise ProjectionError(f"cannot read {path}: {e}")
    try: return raw, json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise ProjectionError(f"invalid UTF-8 JSON {path}: {e}")

def boundary(spec):
    if not isinstance(spec, dict): raise ProjectionError("boundary spec must be an object")
    bid = spec.get("boundary_id")
    req, opt = spec.get("required", []), spec.get("optional", [])
    if not isinstance(bid, str) or not bid.strip(): raise ProjectionError("boundary_id required")
    if not isinstance(req, list) or not all(isinstance(x, str) for x in req): raise ProjectionError("required must be string array")
    if not isinstance(opt, list) or not all(isinstance(x, str) for x in opt): raise ProjectionError("optional must be string array")
    if len(req + opt) != len(set(req + opt)): raise ProjectionError("selectors must be unique")
    for p in req + opt: tokens(p)
    return bid, req, opt

def project(source_path, boundary_path):
    before, source = load(source_path)
    braw, bspec = load(boundary_path)
    bid, req, opt = boundary(bspec)
    items, mr, mo = [], [], []
    for p, required in [(p, True) for p in req] + [(p, False) for p in opt]:
        v = resolve(source, p)
        if v is MISSING: (mr if required else mo).append(p)
        else: items.append({"pointer": p, "required": required, "value": v})
    try: after = source_path.read_bytes()
    except OSError as e: raise ProjectionError(f"cannot re-read {source_path}: {e}")
    if sha(before) != sha(after): raise ProjectionError("source changed during projection")
    return {
        "projection_version": "0.1", "boundary_id": bid,
        "boundary_spec": {"path": str(boundary_path), "sha256": sha(braw)},
        "source": {"path": str(source_path), "sha256": sha(before), "unchanged": True},
        "root_selected": "" in (req + opt),
        "structurally_complete": not mr,
        "items": items, "missing_required": mr, "missing_optional": mo,
        "semantic_sufficiency": "NOT_EVALUATED",
    }

def write_atomic(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode()
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as f: f.write(data); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except OSError: pass
        raise

def main(argv=None):
    ap = argparse.ArgumentParser(description="Derive a boundary-declared JSON projection without mutating source")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("project")
    p.add_argument("--source", required=True); p.add_argument("--boundary", required=True); p.add_argument("--output")
    a = ap.parse_args(argv)
    try:
        src, bnd = Path(a.source), Path(a.boundary)
        out = Path(a.output) if a.output else None
        if out and out.resolve() in {src.resolve(), bnd.resolve()}:
            raise ProjectionError("output may not overwrite source or boundary spec")
        r = project(src, bnd)
        if r["missing_required"]: print(json.dumps(r, indent=2, sort_keys=True)); return 2
        if out: write_atomic(out, r)
        else: print(json.dumps(r, indent=2, sort_keys=True, ensure_ascii=False))
        return 0
    except ProjectionError as e:
        print(f"projection error: {e}", file=sys.stderr); return 2

if __name__ == "__main__": raise SystemExit(main())
