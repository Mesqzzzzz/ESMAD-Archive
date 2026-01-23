import logging
import os
import sys
import structlog
from contextvars import ContextVar

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
SERVICE_NAME = os.getenv("SERVICE_NAME", "files-manager-service")

def configure_logging():
    logging.basicConfig(
        stream=sys.stdout,
        level=LOG_LEVEL,
        format="%(message)s",
    )

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

def log():
    rid = request_id_ctx.get()
    base = structlog.get_logger().bind(service=SERVICE_NAME)
    return base.bind(requestId=rid) if rid else base
