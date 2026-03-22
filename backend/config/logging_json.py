"""
Structured JSON log formatter for production.

Outputs one JSON object per line — compatible with:
- journalctl (systemd)
- CloudWatch Logs
- Datadog / Grafana Loki
- any grep/jq-based log pipeline

Example output:
  {"ts":"2026-03-22T13:45:01.123Z","level":"INFO","logger":"apps.api","msg":"Webhook processed","event_id":"evt_123","company_id":42}

Usage:
  In settings.py, the LOGGING config references this formatter as:
    "()": "config.logging_json.JsonFormatter"

No external dependencies — uses stdlib json + logging.
"""

import json
import logging
import traceback
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """
    Structured JSON formatter.

    Produces one JSON line per log record with consistent field names.
    Extra fields passed via `logger.info("msg", extra={"key": "val"})` are
    merged into the output (no `extra.` prefix needed).
    """

    # Fields to exclude from the extra dict (already handled explicitly)
    _SKIP_FIELDS = frozenset({
        "name", "msg", "args", "levelname", "levelno", "pathname",
        "filename", "module", "exc_info", "exc_text", "stack_info",
        "lineno", "funcName", "created", "msecs", "relativeCreated",
        "thread", "threadName", "processName", "process", "message",
        "taskName",
    })

    def format(self, record: logging.LogRecord) -> str:
        # Base structure
        log_entry = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # Add source location for errors
        if record.levelno >= logging.WARNING:
            log_entry["module"] = record.module
            log_entry["line"] = record.lineno

        # Add exception info
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Merge extra fields (user-supplied context)
        for key, value in record.__dict__.items():
            if key not in self._SKIP_FIELDS and not key.startswith("_"):
                try:
                    json.dumps(value)  # test serializability
                    log_entry[key] = value
                except (TypeError, ValueError):
                    log_entry[key] = str(value)

        try:
            return json.dumps(log_entry, ensure_ascii=False, default=str)
        except Exception:
            # Last resort — never crash the logger
            return json.dumps({
                "ts": datetime.now(tz=timezone.utc).isoformat(),
                "level": "ERROR",
                "logger": "logging_json",
                "msg": f"Failed to serialize log record: {record.getMessage()}",
            })
