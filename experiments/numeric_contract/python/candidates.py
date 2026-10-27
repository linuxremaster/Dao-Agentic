"""WO-003A probes only. No production numeric contract is changed."""

import json
import re
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from types import SimpleNamespace

from core.events import FIELDS, KINDS
from core.predicates import admit

SAFE = 9007199254740991
NUMBER = re.compile(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")


class Hold(ValueError):
    """Input is outside this experiment's explicitly supported domain."""


class Numeric:
    def __init__(self, text):
        self.text = text


def scalar_string(value):
    # JSON string escapes can otherwise carry lone UTF-16 surrogates.
    try:
        value.encode("utf-16-be")
    except UnicodeEncodeError:
        raise Hold("lone surrogate") from None
    return value


def parse(raw):
    """Lossless numeric-token parser; return event and exact payload substring.

    Native float parsing is deliberately never used here. Duplicate keys HOLD.
    """
    if type(raw) is not str:
        raise Hold("raw input must be text")
    index = 0
    payload_text = None
    decoder = json.JSONDecoder()

    def space():
        nonlocal index
        while index < len(raw) and raw[index] in " \t\r\n":
            index += 1

    def string():
        nonlocal index
        if index >= len(raw) or raw[index] != '"':
            raise Hold("invalid JSON")
        value, index = decoder.raw_decode(raw, index)
        return scalar_string(value)

    def value(depth=0):
        nonlocal index, payload_text
        if depth > 64:
            raise Hold("nesting outside subset")
        space()
        if index >= len(raw):
            raise Hold("invalid JSON")
        char = raw[index]
        if char == '"':
            return string()
        if char in "{[":
            index += 1
            obj = {} if char == "{" else []
            close = "}" if char == "{" else "]"
            space()
            if index < len(raw) and raw[index] == close:
                index += 1
                return obj
            while True:
                space()
                if char == "{":
                    key = string()
                    if key in obj:
                        raise Hold("duplicate key")
                    space()
                    if index >= len(raw) or raw[index] != ":":
                        raise Hold("invalid JSON")
                    index += 1
                    space()
                    start = index
                    obj[key] = value(depth + 1)
                    if depth == 0 and key == "payload":
                        payload_text = raw[start:index]
                else:
                    obj.append(value(depth + 1))
                space()
                if index < len(raw) and raw[index] == close:
                    index += 1
                    return obj
                if index >= len(raw) or raw[index] != ",":
                    raise Hold("invalid JSON")
                index += 1
        for token, literal in (("true", True), ("false", False), ("null", None)):
            if raw.startswith(token, index):
                index += len(token)
                return literal
        match = NUMBER.match(raw, index)
        if not match:
            raise Hold("invalid JSON")
        index = match.end()
        return Numeric(match.group())

    try:
        event = value()
        space()
        if index != len(raw):
            raise Hold("invalid JSON")
        return event, payload_text
    except (json.JSONDecodeError, RecursionError):
        raise Hold("invalid or excessively nested JSON") from None


def control(event):
    if type(event) is not dict or set(event) != FIELDS:
        raise Hold("event fields")
    if type(event["event_id"]) is not str or not event["event_id"]:
        raise Hold("event_id")
    if type(event["kind"]) is not str or event["kind"] not in KINDS:
        raise Hold("kind")
    seq = event["sequence"]
    if not isinstance(seq, Numeric) or not re.fullmatch(r"[1-9][0-9]*", seq.text):
        raise Hold("sequence requires positive integer token")
    if len(seq.text) > 16 or int(seq.text) > SAFE:
        raise Hold("sequence outside safe integer range")
    if type(event["payload"]) is not dict:
        raise Hold("payload must be object")
    return {**event, "sequence": int(seq.text)}


def explicit_tag(obj):
    if "$numeric" not in obj:
        return False
    tag = obj["$numeric"]
    if (set(obj) != {"$numeric"} or type(tag) is not dict
            or set(tag) != {"kind", "text"} or type(tag["text"]) is not str
            or tag["kind"] not in ("integer", "decimal")
            or NUMBER.fullmatch(tag["text"]) is None
            or (tag["kind"] == "integer" and re.fullmatch(r"-?(?:0|[1-9][0-9]*)", tag["text"]) is None)):
        raise Hold("reserved numeric tag shape")
    return True


def j_number(text):
    # Deliberately bounded subset, not an ECMAScript number formatter.
    if len(text) > 1024:
        raise Hold("J numeric token limit")
    exponent = int(re.split("[eE]", text)[1]) if re.search("[eE]", text) else 0
    if not -400 <= exponent <= 400:
        raise Hold("J exponent outside subset")
    try:
        value = Decimal(text)
    except InvalidOperation:
        raise Hold("J exponent outside subset") from None
    if value and not -400 <= value.adjusted() <= 400:
        raise Hold("J exponent outside subset")
    if value == value.to_integral_value():
        if value.copy_abs() > SAFE:
            raise Hold("J unsafe integer: use explicit tag")
        return int(value)
    number = float(value)
    if Decimal.from_float(number) != value:
        raise Hold("J inexact binary64: use explicit tag")
    if not Decimal("0.000001") <= value.copy_abs() < Decimal("1e15"):
        raise Hold("J magnitude outside subset")
    fixed = format(value, "f").rstrip("0").rstrip(".")
    significant = fixed.lstrip("-").replace(".", "").lstrip("0")
    if len(significant) > 15:
        raise Hold("J significant digits outside subset")
    return Numeric(fixed)


def transform(value, candidate):
    if isinstance(value, Numeric):
        text = value.text
        if candidate == "J":
            return j_number(text)
        if (re.fullmatch(r"-?(?:0|[1-9][0-9]*)", text) and text != "-0"
                and len(text.lstrip("-")) <= 16 and abs(int(text)) <= SAFE):
            return int(text)
        kind = "integer" if re.fullmatch(r"-?(?:0|[1-9][0-9]*)", text) else "decimal"
        return {"$numeric": {"kind": kind, "text": text}}
    if type(value) is dict:
        if explicit_tag(value):
            return value
        return {key: transform(child, candidate) for key, child in value.items()}
    if type(value) is list:
        return [transform(child, candidate) for child in value]
    return value


def canonical(value, ascii_only=True):
    """Explicit UTF-16 key order; UTF-8 strings for J, ASCII escapes for N/D."""
    if isinstance(value, Numeric):
        return value.text
    if type(value) is dict:
        keys = sorted(value, key=lambda key: key.encode("utf-16-be"))
        return "{" + ",".join(canonical(key, ascii_only) + ":" + canonical(value[key], ascii_only)
                               for key in keys) + "}"
    if type(value) is list:
        return "[" + ",".join(canonical(child, ascii_only) for child in value) + "]"
    return json.dumps(value, ensure_ascii=ascii_only, separators=(",", ":"), allow_nan=False)


def material(candidate, raw):
    if candidate not in ("N", "J", "D"):
        raise Hold("unknown candidate")
    parsed, payload_text = parse(raw)
    event = control(parsed)
    if candidate == "D":
        payload_digest = sha256(payload_text.encode("utf-8")).hexdigest()
        wire = {key: event[key] for key in ("event_id", "sequence", "kind")}
        wire.update(format="D-v1", payload_sha256=payload_digest)
    else:
        payload_digest = None
        wire = {**event, "payload": transform(event["payload"], candidate)}
    encoded = canonical(wire, ascii_only=candidate != "J").encode("utf-8")
    return encoded, event, payload_digest


def observe(candidate, raw):
    try:
        encoded, _, payload_digest = material(candidate, raw)
        return {"result": "ok", "canonical_hex": encoded.hex(),
                "canonical_text": encoded.decode("utf-8"),
                "event_sha256": sha256(encoded).hexdigest(), "payload_sha256": payload_digest}
    except Hold as error:
        return {"result": "HOLD", "reason": str(error)}


def replay(candidate, raw_events):
    state = {"status": "NEW", "last_sequence": 0, "event_ids": [],
             "history_hash": sha256(b"").hexdigest()}
    for raw in raw_events:
        encoded, event, _ = material(candidate, raw)
        status = admit(SimpleNamespace(**state), event)
        state = {"status": status, "last_sequence": event["sequence"],
                 "event_ids": state["event_ids"] + [event["event_id"]],
                 "history_hash": sha256(bytes.fromhex(state["history_hash"]) + encoded).hexdigest()}
    return state
