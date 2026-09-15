from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
import sqlite3
import time
import uuid
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs, quote
from urllib.error import URLError, HTTPError

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, "denty.sqlite")

ALLOWED_AI_INTENTS = {
    "patient.select", "patient.create", "odontogram.set", "odontogram.batch",
    "periodontal.update", "appointment.create", "comment.add", "alert.add",
    "budget.create", "payment.record", "lab.receive", "task.create", "navigation.open",
}
NAV_TARGETS = {"today", "patients", "patientDetail", "agenda", "odontogram", "assistant", "tasks", "jobs", "finances", "settings", "staff"}
TOOTH_STATES = {
    "healthy", "missing", "extraction", "caries", "filling", "filling_bad", "filling_pending",
    "crown", "crown_bad", "crown_pending", "endo", "endo_bad", "endo_indicated", "post",
    "post_bad", "post_pending", "implant", "implant_review", "implant_indicated", "prosthesis",
    "prosthesis_bad", "prosthesis_pending", "removable", "removable_bad", "removable_pending",
}

SYSTEM_PROMPT = """You are the command interpreter for Denty, dental clinic software.
Return one JSON object only. Never invent patient identifiers, prices, diagnoses, signatures, or destructive actions.
Allowed intents: patient.select, patient.create, odontogram.set, periodontal.update, appointment.create, comment.add, alert.add, budget.create, payment.record, lab.receive, task.create, navigation.open.
Shape: {\"intent\": string, \"confidence\": number 0..1, \"slots\": object, \"requires_confirmation\": boolean}.
For odontogram.set, use FDI tooth numbers and only these status values: healthy, missing, extraction, caries, filling, filling_bad, filling_pending, crown, crown_bad, crown_pending, endo, endo_bad, endo_indicated, post, post_bad, post_pending, implant, implant_review, implant_indicated, prosthesis, prosthesis_bad, prosthesis_pending, removable, removable_bad, removable_pending.
Interpret Spanish carefully: 'endodoncia realizada 22' means endo; 'hay que hacer endodoncia 22' means endo_indicated; 'repetir perno 14' means post_bad. If uncertain, use confidence below 0.65 and do not invent missing slots.
"""


def init_db():
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            "create table if not exists sync_state (id integer primary key check (id=1), payload text not null, updated_at integer not null)"
        )
        con.execute(
            "insert or ignore into sync_state (id, payload, updated_at) values (1, ?, ?)",
            (json.dumps({"version": "1.3", "patients": []}), int(time.time())),
        )


def ai_config(environ=None):
    env = os.environ if environ is None else environ
    provider = str(env.get("DENTY_AI_PROVIDER", "off") or "off").strip().lower()
    if provider not in {"off", "ollama", "openai_compatible"}:
        provider = "off"
    default_url = "http://127.0.0.1:11434/api/chat" if provider == "ollama" else ""
    url = str(env.get("DENTY_AI_URL", default_url) or default_url).strip()
    model = str(env.get("DENTY_AI_MODEL", "qwen2.5:3b" if provider == "ollama" else "") or "").strip()
    api_key = str(env.get("DENTY_AI_API_KEY", "") or "").strip()
    timeout = float(env.get("DENTY_AI_TIMEOUT", "8") or 8)
    public = {"provider": provider, "enabled": provider != "off" and bool(url), "model": model, "url": url}
    return {"provider": provider, "enabled": public["enabled"], "url": url, "model": model, "api_key": api_key, "timeout": timeout, "public": public}


def mcp_config(environ=None):
    env = os.environ if environ is None else environ
    url = str(env.get("DENTY_MCP_URL", "") or "").strip()
    token = str(env.get("DENTY_MCP_TOKEN", "") or "").strip()
    timeout = float(env.get("DENTY_MCP_TIMEOUT", "8") or 8)
    return {"enabled": bool(url), "url": url, "token": token, "timeout": timeout, "public": {"enabled": bool(url), "url": url}}


def extract_json_object(value):
    if isinstance(value, dict):
        return value
    text = str(value or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text).strip()
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    obj = json.loads(text[start:i + 1])
                    return obj if isinstance(obj, dict) else None
                except Exception:
                    return None
    return None


def validate_ai_command(command):
    if not isinstance(command, dict):
        return None
    intent = command.get("intent")
    slots = command.get("slots", {})
    if intent not in ALLOWED_AI_INTENTS or not isinstance(slots, dict):
        return None
    if intent == "navigation.open" and slots.get("target") not in NAV_TARGETS:
        return None
    if intent == "odontogram.set":
        tooth = str(slots.get("tooth", ""))
        if not re.fullmatch(r"[1-4][1-8]", tooth) or slots.get("status") not in TOOTH_STATES:
            return None
    if intent == "periodontal.update" and not re.fullmatch(r"[1-4][1-8]", str(slots.get("tooth", ""))):
        return None
    if intent == "payment.record":
        try:
            if float(slots.get("amount", 0)) <= 0:
                return None
        except Exception:
            return None
    confidence = command.get("confidence", 0.5)
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except Exception:
        confidence = 0.5
    return {
        "intent": intent,
        "confidence": confidence,
        "slots": slots,
        "requires_confirmation": bool(command.get("requires_confirmation", intent == "payment.record")),
    }


def _safe_input_payload(payload):
    payload = payload if isinstance(payload, dict) else {}
    text = str(payload.get("text", ""))[:4000]
    context = payload.get("context", {}) if isinstance(payload.get("context", {}), dict) else {}
    context = {
        "patient_id": context.get("patient_id"),
        "patient_name": str(context.get("patient_name", ""))[:160],
        "view": str(context.get("view", ""))[:80],
        "date": str(context.get("date", ""))[:32],
        "source": str(context.get("source", ""))[:40],
    }
    return {"text": text, "context": context}


def interpret_with_provider(payload, opener=urlopen, environ=None):
    cfg = ai_config(environ)
    if not cfg["enabled"]:
        return {"ok": False, "error": "ai_disabled", "provider": cfg["provider"]}
    clean = _safe_input_payload(payload)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(clean, ensure_ascii=False)},
    ]
    headers = {"Content-Type": "application/json"}
    if cfg["provider"] == "ollama":
        body = {"model": cfg["model"], "messages": messages, "stream": False, "format": "json"}
    else:
        body = {"model": cfg["model"], "messages": messages, "temperature": 0, "response_format": {"type": "json_object"}}
        if cfg["api_key"]:
            headers["Authorization"] = f"Bearer {cfg['api_key']}"
    req = Request(cfg["url"], data=json.dumps(body, ensure_ascii=False).encode("utf-8"), headers=headers, method="POST")
    try:
        with opener(req, timeout=cfg["timeout"]) as response:
            data = json.loads(response.read().decode("utf-8") or "{}")
        if cfg["provider"] == "ollama":
            content = (data.get("message") or {}).get("content", "")
        else:
            choices = data.get("choices") or []
            content = ((choices[0].get("message") or {}).get("content", "")) if choices else ""
        command = validate_ai_command(extract_json_object(content))
        if not command:
            return {"ok": False, "error": "invalid_ai_command", "provider": cfg["provider"]}
        command["source"] = "llm"
        return {"ok": True, "command": command, "provider": cfg["provider"]}
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": "ai_request_failed", "provider": cfg["provider"], "detail": str(exc)[:240]}


def interpret_with_mcp(payload, opener=urlopen, environ=None):
    cfg = mcp_config(environ)
    if not cfg["enabled"]:
        return {"ok": False, "error": "mcp_disabled"}
    clean = _safe_input_payload(payload)
    body = {"type": "denty.voice.interpret", "version": "1", "payload": clean, "allowed_intents": sorted(ALLOWED_AI_INTENTS)}
    headers = {"Content-Type": "application/json"}
    if cfg["token"]:
        headers["Authorization"] = f"Bearer {cfg['token']}"
    req = Request(cfg["url"], data=json.dumps(body, ensure_ascii=False).encode("utf-8"), headers=headers, method="POST")
    try:
        with opener(req, timeout=cfg["timeout"]) as response:
            data = json.loads(response.read().decode("utf-8") or "{}")
        raw = data.get("command", data)
        command = validate_ai_command(raw)
        if not command:
            return {"ok": False, "error": "invalid_mcp_command"}
        command["source"] = "mcp"
        return {"ok": True, "command": command, "provider": "mcp"}
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": "mcp_request_failed", "detail": str(exc)[:240]}


MOCK_PAYMENT_READERS = [
    {"id": "mock_reader_1", "name": "Datáfono virtual Denty", "status": "paired", "device": {"identifier": "DENTY-VIRTUAL-01", "model": "virtual-solo"}},
]
MOCK_PAYMENT_CHECKOUTS = {}


def _mask_merchant(value):
    value = str(value or "")
    if len(value) <= 6:
        return "***" if value else ""
    return value[:3] + "***" + value[-3:]


def payment_config(environ=None):
    env = os.environ if environ is None else environ
    provider = str(env.get("DENTY_PAYMENT_PROVIDER", "off") or "off").strip().lower()
    if provider not in {"off", "sumup", "mock"}:
        provider = "off"
    api_key = str(env.get("SUMUP_API_KEY", "") or "").strip()
    merchant_code = str(env.get("SUMUP_MERCHANT_CODE", "") or "").strip()
    affiliate_key = str(env.get("SUMUP_AFFILIATE_KEY", "") or "").strip()
    app_id = str(env.get("SUMUP_APP_ID", "com.denty.clinic") or "com.denty.clinic").strip()
    api_base = str(env.get("SUMUP_API_BASE", "https://api.sumup.com") or "https://api.sumup.com").rstrip("/")
    timeout = float(env.get("DENTY_PAYMENT_TIMEOUT", "12") or 12)
    mock_outcome = str(env.get("DENTY_PAYMENT_MOCK_OUTCOME", "successful") or "successful").lower()
    if mock_outcome not in {"successful", "failed", "cancelled"}:
        mock_outcome = "successful"
    enabled = provider == "mock" or (provider == "sumup" and bool(api_key and merchant_code and affiliate_key and app_id))
    public = {
        "provider": provider,
        "enabled": enabled,
        "mode": "sandbox" if provider == "mock" else ("live" if provider == "sumup" else "off"),
        "merchant_code_masked": _mask_merchant(merchant_code),
        "app_id": app_id if provider == "sumup" else "",
        "currency": "EUR",
    }
    return {
        "provider": provider, "enabled": enabled, "api_key": api_key, "merchant_code": merchant_code,
        "affiliate_key": affiliate_key, "app_id": app_id, "api_base": api_base, "timeout": timeout,
        "mock_outcome": mock_outcome, "public": public,
    }


def _payment_json_request(method, path, body=None, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    if cfg["provider"] != "sumup" or not cfg["enabled"]:
        return {"ok": False, "error": "payment_provider_not_ready"}
    headers = {"Authorization": f"Bearer {cfg['api_key']}", "Accept": "application/json"}
    raw = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = Request(cfg["api_base"] + path, data=raw, headers=headers, method=method)
    try:
        with opener(req, timeout=cfg["timeout"]) as response:
            data = json.loads(response.read().decode("utf-8") or "{}")
        return {"ok": True, "data": data}
    except HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8") or "{}")
        except Exception:
            detail = {"detail": str(exc)}
        return {"ok": False, "error": "payment_provider_error", "status": getattr(exc, "code", 502), "detail": detail}
    except (URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": "payment_provider_unreachable", "detail": str(exc)[:240]}


def _normalize_reader(reader):
    reader = reader if isinstance(reader, dict) else {}
    device = reader.get("device") if isinstance(reader.get("device"), dict) else {}
    return {
        "id": str(reader.get("id", "")), "name": str(reader.get("name", "Datáfono")),
        "status": str(reader.get("status", "unknown")),
        "device": {"identifier": str(device.get("identifier", "")), "model": str(device.get("model", ""))},
        "created_at": reader.get("created_at"), "updated_at": reader.get("updated_at"),
    }


def payment_list_readers(opener=urlopen, environ=None):
    cfg = payment_config(environ)
    if cfg["provider"] == "mock":
        return {"ok": True, "provider": "mock", "readers": [dict(r) for r in MOCK_PAYMENT_READERS]}
    if not cfg["enabled"]:
        return {"ok": False, "error": "payment_provider_not_ready", "provider": cfg["provider"], "readers": []}
    out = _payment_json_request("GET", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers", opener=opener, environ=environ)
    if not out.get("ok"):
        return {**out, "provider": cfg["provider"], "readers": []}
    raw = out.get("data")
    if isinstance(raw, list): readers = raw
    elif isinstance(raw, dict): readers = raw.get("items") or raw.get("readers") or raw.get("data") or []
    else: readers = []
    if isinstance(readers, dict): readers = [readers]
    return {"ok": True, "provider": cfg["provider"], "readers": [_normalize_reader(r) for r in readers]}


def payment_pair_reader(payload, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    payload = payload if isinstance(payload, dict) else {}
    code = str(payload.get("pairing_code", "")).strip().upper()
    name = str(payload.get("name", "Datáfono Denty")).strip()[:500] or "Datáfono Denty"
    if not re.fullmatch(r"[A-Z0-9]{8,9}", code):
        return {"ok": False, "error": "invalid_pairing_code"}
    if cfg["provider"] == "mock":
        reader = {"id": f"mock_reader_{len(MOCK_PAYMENT_READERS)+1}", "name": name, "status": "paired", "device": {"identifier": code, "model": "virtual-solo"}}
        MOCK_PAYMENT_READERS.append(reader)
        return {"ok": True, "provider": "mock", "reader": dict(reader)}
    if not cfg["enabled"]:
        return {"ok": False, "error": "payment_provider_not_ready"}
    out = _payment_json_request("POST", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers", {"pairing_code": code, "name": name, "metadata": {"source": "denty"}}, opener, environ)
    if not out.get("ok"): return out
    return {"ok": True, "provider": cfg["provider"], "reader": _normalize_reader(out.get("data"))}


def payment_reader_status(reader_id, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    reader_id = str(reader_id or "").strip()
    if not reader_id: return {"ok": False, "error": "missing_reader_id"}
    if cfg["provider"] == "mock":
        return {"ok": True, "provider": "mock", "status": {"status": "ONLINE", "state": "IDLE", "battery_level": 100}}
    out = _payment_json_request("GET", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers/{quote(reader_id)}/status", opener=opener, environ=environ)
    if not out.get("ok"): return out
    raw = out.get("data") or {}
    if isinstance(raw, dict) and isinstance(raw.get("data"), dict): raw = raw["data"]
    return {"ok": True, "provider": cfg["provider"], "status": raw}


def _normalize_checkout(raw, reader_id=""):
    if isinstance(raw, dict) and isinstance(raw.get("data"), dict): raw = raw["data"]
    raw = raw if isinstance(raw, dict) else {}
    total = raw.get("total_amount") if isinstance(raw.get("total_amount"), dict) else {}
    status = str(raw.get("status") or raw.get("payment_status") or "pending").lower()
    if status == "paid": status = "successful"
    if status not in {"pending", "successful", "failed", "cancelled"}: status = "pending"
    return {
        "checkout_id": str(raw.get("checkout_id", "")),
        "client_transaction_id": str(raw.get("client_transaction_id", "")),
        "reader_id": str(reader_id or raw.get("reader_id", "")),
        "status": status,
        "payment_status": raw.get("payment_status"),
        "failure_reason": str(raw.get("payment_failure_reason") or raw.get("failure_reason") or ""),
        "amount_cents": int(total.get("value", raw.get("amount_cents", 0)) or 0),
        "currency": str(total.get("currency", raw.get("currency", "EUR")) or "EUR"),
        "created_at": raw.get("created_at"), "updated_at": raw.get("updated_at"), "valid_until": raw.get("valid_until"),
    }


def payment_create_checkout(payload, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    payload = payload if isinstance(payload, dict) else {}
    try: amount_cents = int(payload.get("amount_cents", 0))
    except Exception: amount_cents = 0
    if amount_cents <= 0: return {"ok": False, "error": "invalid_amount"}
    reader_id = str(payload.get("reader_id", "")).strip()
    if not reader_id: return {"ok": False, "error": "missing_reader_id"}
    currency = str(payload.get("currency", "EUR") or "EUR").upper()
    if not re.fullmatch(r"[A-Z]{3}", currency): return {"ok": False, "error": "invalid_currency"}
    transaction_id = str(payload.get("transaction_id", "") or "").strip()[:80]
    if not transaction_id: transaction_id = "denty-" + str(uuid.uuid4())
    description = str(payload.get("description", "Cobro Denty") or "Cobro Denty")[:500]
    if cfg["provider"] == "mock":
        checkout_id = "mock_" + str(uuid.uuid4())
        row = {"checkout_id": checkout_id, "client_transaction_id": transaction_id, "reader_id": reader_id, "status": "pending", "amount_cents": amount_cents, "currency": currency, "polls": 0, "outcome": cfg["mock_outcome"], "created_at": time.time()}
        MOCK_PAYMENT_CHECKOUTS[checkout_id] = row
        return {"ok": True, "provider": "mock", "checkout": _normalize_checkout(row, reader_id)}
    if not cfg["enabled"]: return {"ok": False, "error": "payment_provider_not_ready"}
    body = {
        "total_amount": {"currency": currency, "minor_unit": 2, "value": amount_cents},
        "description": description,
        "affiliate": {"app_id": cfg["app_id"], "foreign_transaction_id": transaction_id, "key": cfg["affiliate_key"], "tags": {"source": "denty"}},
    }
    return_url = str((os.environ if environ is None else environ).get("DENTY_PAYMENT_RETURN_URL", "") or "").strip()
    if return_url: body["return_url"] = return_url
    out = _payment_json_request("POST", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers/{quote(reader_id)}/checkout", body, opener, environ)
    if not out.get("ok"): return out
    checkout = _normalize_checkout(out.get("data"), reader_id)
    checkout["status"] = "pending"
    checkout["amount_cents"] = amount_cents
    checkout["currency"] = currency
    return {"ok": True, "provider": cfg["provider"], "checkout": checkout}


def payment_get_checkout(reader_id, checkout_id, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    reader_id, checkout_id = str(reader_id or "").strip(), str(checkout_id or "").strip()
    if not reader_id or not checkout_id: return {"ok": False, "error": "missing_checkout_reference"}
    if cfg["provider"] == "mock":
        row = MOCK_PAYMENT_CHECKOUTS.get(checkout_id)
        if not row: return {"ok": False, "error": "checkout_not_found"}
        row["polls"] = int(row.get("polls", 0)) + 1
        if row["polls"] >= 2 and row.get("status") == "pending": row["status"] = row.get("outcome", "successful")
        return {"ok": True, "provider": "mock", "checkout": _normalize_checkout(row, reader_id)}
    out = _payment_json_request("GET", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers/{quote(reader_id)}/checkout/{quote(checkout_id)}", opener=opener, environ=environ)
    if not out.get("ok"): return out
    return {"ok": True, "provider": cfg["provider"], "checkout": _normalize_checkout(out.get("data"), reader_id)}


def payment_terminate(reader_id, opener=urlopen, environ=None):
    cfg = payment_config(environ)
    reader_id = str(reader_id or "").strip()
    if not reader_id: return {"ok": False, "error": "missing_reader_id"}
    if cfg["provider"] == "mock":
        for row in MOCK_PAYMENT_CHECKOUTS.values():
            if row.get("reader_id") == reader_id and row.get("status") == "pending": row["status"] = "cancelled"
        return {"ok": True, "provider": "mock", "accepted": True}
    out = _payment_json_request("POST", f"/v0.1/merchants/{quote(cfg['merchant_code'])}/readers/{quote(reader_id)}/terminate", None, opener, environ)
    if not out.get("ok"): return out
    return {"ok": True, "provider": cfg["provider"], "accepted": True}


class DentyHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        if path == "/api/payments/status":
            self._json({"ok": True, "payments": payment_config()["public"]})
            return
        if path == "/api/payments/readers":
            out = payment_list_readers()
            self._json(out, 200 if out.get("ok") else 503)
            return
        if path == "/api/payments/reader-status":
            out = payment_reader_status((query.get("reader_id") or [""])[0])
            self._json(out, 200 if out.get("ok") else 503)
            return
        if path == "/api/payments/checkout":
            out = payment_get_checkout((query.get("reader_id") or [""])[0], (query.get("checkout_id") or [""])[0])
            self._json(out, 200 if out.get("ok") else 503)
            return
        if path == "/api/sync/pull":
            with sqlite3.connect(DB_PATH) as con:
                row = con.execute("select payload, updated_at from sync_state where id=1").fetchone()
            self._json({"ok": True, "payload": json.loads(row[0]), "updated_at": row[1]})
            return
        if self.path == "/api/ai/status":
            cfg = ai_config()
            mcp = mcp_config()
            self._json({"ok": True, "ai": cfg["public"], "mcp": mcp["public"]})
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/payments/readers/pair":
            payload = self._read_json()
            if payload is None: return
            out = payment_pair_reader(payload)
            self._json(out, 200 if out.get("ok") else 400)
            return
        if self.path == "/api/payments/checkout":
            payload = self._read_json()
            if payload is None: return
            out = payment_create_checkout(payload)
            self._json(out, 200 if out.get("ok") else 503)
            return
        if self.path == "/api/payments/terminate":
            payload = self._read_json()
            if payload is None: return
            out = payment_terminate(payload.get("reader_id"))
            self._json(out, 200 if out.get("ok") else 503)
            return
        if self.path == "/api/sync/push":
            payload = self._read_json(max_bytes=10_000_000)
            if payload is None:
                return
            with sqlite3.connect(DB_PATH) as con:
                con.execute(
                    "update sync_state set payload=?, updated_at=? where id=1",
                    (json.dumps(payload, ensure_ascii=False), int(time.time())),
                )
            self._json({"ok": True})
            return
        if self.path == "/api/ai/interpret":
            payload = self._read_json()
            if payload is None:
                return
            out = interpret_with_provider(payload)
            self._json(out, 200 if out.get("ok") else 503)
            return
        if self.path == "/api/mcp/interpret":
            payload = self._read_json()
            if payload is None:
                return
            out = interpret_with_mcp(payload)
            self._json(out, 200 if out.get("ok") else 503)
            return
        self.send_error(404)

    def _read_json(self, max_bytes=65536):
        try:
            size = int(self.headers.get("content-length", "0"))
            if size <= 0 or size > max_bytes:
                self._json({"ok": False, "error": "invalid_content_length"}, 400)
                return None
            body = self.rfile.read(size)
            data = json.loads(body.decode("utf-8") or "{}")
            if not isinstance(data, dict):
                raise ValueError("JSON object required")
            return data
        except Exception as exc:
            self._json({"ok": False, "error": "invalid_json", "detail": str(exc)[:160]}, 400)
            return None

    def _json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    os.chdir(ROOT)
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), DentyHandler)
    cfg = ai_config()
    mcp = mcp_config()
    payments = payment_config()
    print("Denty local SQLite server: http://127.0.0.1:8765")
    print(f"Voice AI provider: {cfg['provider']} ({'enabled' if cfg['enabled'] else 'disabled'})")
    print(f"MCP adapter: {'enabled' if mcp['enabled'] else 'disabled'}")
    print(f"Payment provider: {payments['provider']} ({'enabled' if payments['enabled'] else 'disabled'})")
    server.serve_forever()
