import copy
import unittest

from core.leases import (
    LeaseError, LeaseState, active_leases, active_roles, decide_authority,
    has_active_lease, make_decision_event, make_lease_rotation_events,
    reduce_lease, replay_leases,
)


def ev(seq, kind, payload, event_id=None):
    return {"event_id": event_id or f"e{seq}", "sequence": seq, "kind": kind, "payload": payload}


def role(seq=1, expires=10):
    return ev(seq, "ROLE_LEASE_GRANTED", {
        "lease_id": "role-1", "subject": "agent-a", "role": "AUDITOR",
        "scope": "repo-x", "expires_sequence": expires,
    })


def lease(seq=1, expires=10, **overrides):
    payload = {
        "lease_id": "lease-1", "subject": "agent-a", "lease_class": "TASK",
        "resource": "task-17", "scope": "repo-x", "purpose": "perform-assigned-task",
        "expires_sequence": expires,
    }
    payload.update(overrides)
    return ev(seq, "LEASE_GRANTED", payload)


def grant(seq=1, expires=10, evidence=None):
    return ev(seq, "AUTHORITY_GRANTED", {
        "grant_id": "grant-1", "subject": "agent-a", "action": "MERGE",
        "target": "sha-123", "scope": "repo-x", "expires_sequence": expires,
        "required_evidence": evidence or [],
    })


def request(**overrides):
    base = {
        "request_id": "req-1", "subject": "agent-a", "action": "MERGE",
        "target": "sha-123", "scope": "repo-x", "evidence_ids": [],
    }
    return base | overrides


class LeaseTests(unittest.TestCase):
    def test_role_never_grants_authority(self):
        state = replay_leases([role()])
        self.assertEqual([r.role for r in active_roles(state, "agent-a", "repo-x")], ["AUDITOR"])
        self.assertFalse(decide_authority(state, request()).allowed)

    def test_universal_role_lease_is_visible_but_never_grants_authority(self):
        state = replay_leases([lease(lease_class="ROLE", resource="AUDITOR", purpose="routing")])
        self.assertEqual([r.role for r in active_roles(state, "agent-a", "repo-x")], ["AUDITOR"])
        self.assertTrue(has_active_lease(state, "agent-a", "ROLE", "AUDITOR", "repo-x"))
        self.assertFalse(decide_authority(state, request()).allowed)

    def test_generic_task_tool_and_wake_leases_expire_and_release(self):
        state = replay_leases([
            lease(1, 8, lease_id="task-lease", lease_class="TASK", resource="task-17"),
            lease(2, 8, lease_id="tool-lease", lease_class="TOOL_ACCESS", resource="github-read", purpose="inspect-repository"),
            lease(3, 8, lease_id="wake-lease", lease_class="WAKE_RIGHT", resource="scheduled-wake", purpose="periodic-check"),
        ])
        self.assertTrue(has_active_lease(state, "agent-a", "TASK", "task-17", "repo-x", sequence=7))
        self.assertTrue(has_active_lease(state, "agent-a", "TOOL_ACCESS", "github-read", "repo-x", sequence=7))
        self.assertEqual(len(active_leases(state, "agent-a", "WAKE_RIGHT", "repo-x", sequence=7)), 1)
        self.assertFalse(has_active_lease(state, "agent-a", "TASK", "task-17", "repo-x", sequence=8))
        state = reduce_lease(state, ev(4, "LEASE_RELEASED", {"lease_id": "tool-lease"}))
        self.assertFalse(has_active_lease(state, "agent-a", "TOOL_ACCESS", "github-read", "repo-x", sequence=7))

    def test_generic_capability_lease_never_satisfies_authority(self):
        state = replay_leases([lease(lease_class="CAPABILITY", resource="MERGE", purpose="candidate-capability")])
        self.assertTrue(has_active_lease(state, "agent-a", "CAPABILITY", "MERGE", "repo-x"))
        self.assertFalse(decide_authority(state, request()).allowed)

    def test_rotation_releases_old_before_new_and_preserves_meaning(self):
        first = lease(expires=20, lease_class="TASK", resource="task-17", purpose="audit")
        state = replay_leases([first])
        release, replacement = make_lease_rotation_events(
            state, "lease-1",
            release_event_id="rotate-release",
            grant_event_id="rotate-grant",
            new_lease_id="lease-2",
            new_subject="agent-b",
            expires_sequence=30,
        )
        self.assertEqual((release["sequence"], replacement["sequence"]), (2, 3))
        self.assertEqual(replacement["payload"]["lease_class"], "TASK")
        self.assertEqual(replacement["payload"]["resource"], "task-17")
        self.assertEqual(replacement["payload"]["scope"], "repo-x")
        rotated = replay_leases([first, release, replacement])
        self.assertFalse(has_active_lease(rotated, "agent-a", "TASK", "task-17", "repo-x", sequence=4))
        self.assertTrue(has_active_lease(rotated, "agent-b", "TASK", "task-17", "repo-x", sequence=4))

    def test_legacy_role_rotates_without_authority_inheritance(self):
        first = role(expires=20)
        state = replay_leases([first])
        release, replacement = make_lease_rotation_events(
            state, "role-1",
            release_event_id="role-release",
            grant_event_id="role-grant",
            new_lease_id="role-2",
            new_subject="agent-b",
            expires_sequence=30,
        )
        rotated = replay_leases([first, release, replacement])
        self.assertEqual(active_roles(rotated, "agent-a", "repo-x", sequence=4), ())
        self.assertEqual([r.role for r in active_roles(rotated, "agent-b", "repo-x", sequence=4)], ["AUDITOR"])
        self.assertFalse(decide_authority(rotated, request(subject="agent-b")).allowed)

    def test_valid_exact_grant_allows(self):
        state = replay_leases([grant()])
        decision = decide_authority(state, request())
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.grant_id, "grant-1")

    def test_subject_action_target_scope_are_exact(self):
        state = replay_leases([grant()])
        for key, value in (("subject", "other"), ("action", "DELETE"),
                           ("target", "sha-999"), ("scope", "repo-y")):
            with self.subTest(key=key):
                self.assertFalse(decide_authority(state, request(**{key: value})).allowed)

    def test_required_evidence_is_enforced(self):
        state = replay_leases([grant(evidence=["audit-pass"])])
        self.assertFalse(decide_authority(state, request()).allowed)
        self.assertTrue(decide_authority(state, request(evidence_ids=["audit-pass"])).allowed)

    def test_expiry_is_mandatory_and_enforced(self):
        with self.assertRaises(LeaseError):
            replay_leases([grant(expires=1)])
        state = replay_leases([grant(expires=3), ev(2, "AUTHORITY_DECIDED", {
            **request(), "allowed": True, "reason": "VALID_SCOPED_GRANT", "grant_id": "grant-1"
        })])
        self.assertFalse(decide_authority(state, request(request_id="req-2"), sequence=3).allowed)

    def test_release_revokes_before_expiry(self):
        state = replay_leases([grant(), ev(2, "AUTHORITY_RELEASED", {"grant_id": "grant-1"})])
        self.assertFalse(decide_authority(state, request()).allowed)

    def test_role_release_and_expiry(self):
        state = replay_leases([role(expires=4)])
        self.assertEqual(len(active_roles(state, "agent-a", "repo-x", sequence=3)), 1)
        self.assertEqual(len(active_roles(state, "agent-a", "repo-x", sequence=4)), 0)
        state = reduce_lease(state, ev(2, "ROLE_LEASE_RELEASED", {"lease_id": "role-1"}))
        self.assertEqual(active_roles(state, "agent-a", "repo-x", sequence=3), ())

    def test_authority_shaped_fields_are_rejected(self):
        state = replay_leases([grant()])
        for key in ("role", "title", "claimed_authority", "authorized_by"):
            with self.subTest(key=key):
                with self.assertRaises(LeaseError):
                    decide_authority(state, request() | {key: "ROOT"})

    def test_wildcards_forbidden(self):
        for field in ("subject", "action", "target", "scope"):
            payload = grant()["payload"].copy()
            payload[field] = "*"
            with self.subTest(field=field), self.assertRaises(LeaseError):
                replay_leases([grant() | {"payload": payload}])
        for field in ("subject", "lease_class", "resource", "scope", "purpose"):
            payload = lease()["payload"].copy()
            payload[field] = "*"
            with self.subTest(field=field), self.assertRaises(LeaseError):
                replay_leases([lease() | {"payload": payload}])

    def test_forged_decision_event_rejected(self):
        state = LeaseState()
        forged = ev(1, "AUTHORITY_DECIDED", {
            **request(), "allowed": True, "reason": "VALID_SCOPED_GRANT", "grant_id": "fake"
        })
        with self.assertRaises(LeaseError):
            reduce_lease(state, forged)

    def test_generated_decision_event_is_self_checking(self):
        state = replay_leases([grant()])
        event = make_decision_event(state, request(), "decision-1")
        state2 = reduce_lease(state, event)
        self.assertTrue(state2.decisions[-1]["allowed"])
        self.assertEqual(state2.decisions[-1]["grant_id"], "grant-1")

    def test_replay_deterministic_and_prior_mutation_invalidates_decision(self):
        history = [grant(), make_decision_event(replay_leases([grant()]), request(), "decision-1")]
        original = copy.deepcopy(history)
        self.assertEqual(replay_leases(history), replay_leases(copy.deepcopy(history)))
        history[0]["payload"]["target"] = "mutated"
        self.assertEqual(replay_leases(original), replay_leases(copy.deepcopy(original)))
        with self.assertRaises(LeaseError):
            replay_leases(history)


if __name__ == "__main__":
    unittest.main()
