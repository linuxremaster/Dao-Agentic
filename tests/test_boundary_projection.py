import json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; TOOL = ROOT / "tools" / "boundary_projection.py"

class T(unittest.TestCase):
    def run_tool(self, *a):
        return subprocess.run([sys.executable, str(TOOL), *a], text=True, capture_output=True)
    def files(self, d, source, spec):
        s, b = d/"s.json", d/"b.json"; s.write_text(source); b.write_text(json.dumps(spec)); return s,b
    def test_projection_preserves_source(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); raw='{"a":{"b":7},"x":[{"id":"q"}]}\n'; s,b=self.files(d,raw,{"boundary_id":"b","required":["/a/b","/x/0/id"],"optional":["/no"]}); o=d/"o.json"
            r=self.run_tool("project","--source",str(s),"--boundary",str(b),"--output",str(o)); self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(s.read_text(),raw)
            x=json.loads(o.read_text()); self.assertTrue(x["source"]["unchanged"]); self.assertEqual(x["semantic_sufficiency"],"NOT_EVALUATED"); self.assertEqual(x["missing_optional"],["/no"])
    def test_missing_required_fails_no_output(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); s,b=self.files(d,'{"a":1}\n',{"boundary_id":"b","required":["/no"]}); o=d/"o.json"; r=self.run_tool("project","--source",str(s),"--boundary",str(b),"--output",str(o)); self.assertEqual(r.returncode,2); self.assertFalse(o.exists()); self.assertEqual(json.loads(r.stdout)["missing_required"],["/no"])
    def test_pointer_escapes_and_array(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); s,b=self.files(d,json.dumps({"a/b":{"~k":[10,20]}}),{"boundary_id":"b","required":["/a~1b/~0k/1"]}); r=self.run_tool("project","--source",str(s),"--boundary",str(b)); self.assertEqual(json.loads(r.stdout)["items"][0]["value"],20)
    def test_overwrite_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); s,b=self.files(d,'{"a":1}\n',{"boundary_id":"b","required":["/a"]}); r=self.run_tool("project","--source",str(s),"--boundary",str(b),"--output",str(s)); self.assertEqual(r.returncode,2); self.assertIn("overwrite",r.stderr)
    def test_boundary_hash_deterministic(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); s,b=self.files(d,'{"a":1}\n',{"boundary_id":"b","required":["/a"]}); a=self.run_tool("project","--source",str(s),"--boundary",str(b)); c=self.run_tool("project","--source",str(s),"--boundary",str(b)); self.assertEqual(json.loads(a.stdout)["boundary_spec"]["sha256"],json.loads(c.stdout)["boundary_spec"]["sha256"])
    def test_root_pointer_non_lossy(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); s,b=self.files(d,'{"a":1}\n',{"boundary_id":"id","required":[""]}); r=self.run_tool("project","--source",str(s),"--boundary",str(b)); x=json.loads(r.stdout); self.assertFalse(x["lossy"]); self.assertEqual(x["items"][0]["value"],{"a":1})

if __name__ == "__main__": unittest.main()
